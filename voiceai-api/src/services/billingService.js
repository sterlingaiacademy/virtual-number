const db = require('../config/database');
const { emailService } = require('./emailService');

const billingService = {
  /**
   * Generate a monthly invoice for a client
   * Calculates total call minutes * per-minute rate + plan base fee
   */
  async generateInvoice(clientId, periodStart, periodEnd) {
    const client = await db.query(
      `SELECT c.*, p.name as plan_name, p.monthly_fee, p.per_minute_rate
       FROM clients c JOIN plans p ON c.plan_id = p.id
       WHERE c.id = $1`,
      [clientId]
    );
    if (!client.rows.length) throw new Error('Client not found');
    const c = client.rows[0];

    // Sum billable minutes in period
    const callsResult = await db.query(
      `SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds
       FROM calls
       WHERE client_id = $1 AND started_at >= $2 AND started_at < $3 AND status = 'completed'`,
      [clientId, periodStart, periodEnd]
    );
    const totalMinutes = Math.ceil(callsResult.rows[0].total_seconds / 60);
    const callCharges = parseFloat((totalMinutes * parseFloat(c.per_minute_rate)).toFixed(2));
    const planFee = parseFloat(c.monthly_fee);
    const totalAmount = parseFloat((planFee + callCharges).toFixed(2));

    const invoiceNumber = `INV-${Date.now()}-${clientId.slice(0, 6).toUpperCase()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const result = await db.query(
      `INSERT INTO invoices (client_id, invoice_number, period_start, period_end, amount,
        plan_fee, call_charges, total_minutes, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING *`,
      [clientId, invoiceNumber, periodStart, periodEnd, totalAmount, planFee, callCharges, totalMinutes, dueDate]
    );

    const invoice = result.rows[0];

    // Send invoice email
    try {
      await emailService.sendInvoice({
        to: c.email,
        businessName: c.business_name,
        invoiceNumber: invoice.invoice_number,
        amount: totalAmount,
        dueDate: dueDate.toDateString(),
      });
    } catch (err) {
      console.error('Invoice email failed:', err.message);
    }

    return invoice;
  },

  /**
   * Mark an invoice as paid
   */
  async markPaid(invoiceId, { paymentMethod, transactionId, paidAt } = {}) {
    const result = await db.query(
      `UPDATE invoices SET status = 'paid', paid_at = $2, payment_method = $3, transaction_id = $4
       WHERE id = $1 RETURNING *`,
      [invoiceId, paidAt || new Date(), paymentMethod || 'manual', transactionId || null]
    );
    return result.rows[0];
  },

  /**
   * Send payment reminder for a pending invoice
   */
  async sendReminder(invoiceId) {
    const result = await db.query(
      `SELECT i.*, c.email, c.business_name FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [invoiceId]
    );
    if (!result.rows.length) throw new Error('Invoice not found');
    const inv = result.rows[0];

    await emailService.sendPaymentReminder({
      to: inv.email,
      businessName: inv.business_name,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      dueDate: new Date(inv.due_date).toDateString(),
    });

    await db.query(`UPDATE invoices SET last_reminder_at = NOW() WHERE id = $1`, [invoiceId]);
    return inv;
  },

  /**
   * Check all clients for overdue invoices and auto-suspend if needed
   */
  async runOverdueCheck() {
    const overdue = await db.query(
      `SELECT i.client_id, i.id, i.amount FROM invoices i
       WHERE i.status = 'pending' AND i.due_date < NOW() - INTERVAL '3 days'
       AND i.client_id NOT IN (SELECT client_id FROM invoices WHERE status = 'pending' AND due_date > NOW() - INTERVAL '3 days')`
    );

    for (const inv of overdue.rows) {
      await db.query(`UPDATE clients SET status = 'suspended' WHERE id = $1`, [inv.client_id]);
      console.log(`Suspended client ${inv.client_id} for overdue invoice ${inv.id}`);
    }

    return overdue.rows.length;
  },

  /**
   * Get revenue summary for a date range
   */
  async getRevenueSummary(from, to) {
    const result = await db.query(
      `SELECT
         SUM(amount) FILTER (WHERE status = 'paid') AS paid_revenue,
         SUM(amount) FILTER (WHERE status = 'pending') AS pending_revenue,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
       FROM invoices WHERE period_start >= $1 AND period_end <= $2`,
      [from, to]
    );
    return result.rows[0];
  },
};

module.exports = { billingService };
