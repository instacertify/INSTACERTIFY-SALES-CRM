# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_months, getdate, now_datetime


class ICRenewalReminder(Document):
	def validate(self):
		self.remind_on = getdate(self.remind_on) if self.remind_on else None
		self._fill_from_links()

	def _fill_from_links(self):
		if self.lead and (not self.customer_name or not self.company):
			lead = frappe.db.get_value(
				"IC Lead",
				self.lead,
				["customer_name", "company", "email", "assigned_to"],
				as_dict=True,
			)
			if lead:
				self.customer_name = self.customer_name or lead.customer_name
				self.company = self.company or lead.company
				self.email = self.email or lead.email
				self.assigned_to = self.assigned_to or lead.assigned_to

		if self.quote and (not self.customer_name or not self.service):
			quote = frappe.db.get_value(
				"IC Quote",
				self.quote,
				["customer_name", "company", "email", "lead", "service"],
				as_dict=True,
			)
			if quote:
				self.customer_name = self.customer_name or quote.customer_name
				self.company = self.company or quote.company
				self.email = self.email or quote.email
				self.lead = self.lead or quote.lead
				self.service = self.service or quote.service


def schedule_renewal_reminders(
	*,
	delivery: str | None = None,
	quote: str | None = None,
	lead: str | None = None,
	project: str | None = None,
	service: str | None = None,
	customer_name: str | None = None,
	company: str | None = None,
	email: str | None = None,
	assigned_to: str | None = None,
	remind_6_months: int | bool = 0,
	remind_1_year: int | bool = 0,
	custom_renewal_on=None,
	base_date=None,
	notes: str | None = None,
):
	"""Create certification renewal reminders from delivery checkboxes."""
	base = getdate(base_date or now_datetime())
	created = []

	intervals = []
	if remind_6_months:
		intervals.append(("6 Months", add_months(base, 6)))
	if remind_1_year:
		intervals.append(("1 Year", add_months(base, 12)))
	if custom_renewal_on:
		intervals.append(("Custom", getdate(custom_renewal_on)))

	for label, remind_on in intervals:
		existing = frappe.db.exists(
			"IC Renewal Reminder",
			{
				"delivery_record": delivery,
				"interval_label": label,
				"status": ["in", ["Scheduled", "Notified"]],
			}
			if delivery
			else {
				"quote": quote,
				"interval_label": label,
				"status": ["in", ["Scheduled", "Notified"]],
			},
		)
		if existing:
			created.append(existing)
			continue

		title = f"{customer_name or company or 'Customer'} — {label} renewal"
		if service:
			title = f"{title} ({service})"

		doc = frappe.get_doc(
			{
				"doctype": "IC Renewal Reminder",
				"title": title[:140],
				"interval_label": label,
				"remind_on": remind_on,
				"status": "Scheduled",
				"service": service,
				"project": project,
				"lead": lead,
				"quote": quote,
				"delivery_record": delivery,
				"customer_name": customer_name,
				"company": company,
				"email": email,
				"assigned_to": assigned_to or frappe.session.user,
				"notes": notes,
			}
		)
		doc.insert(ignore_permissions=True)
		created.append(doc.name)

	return created
