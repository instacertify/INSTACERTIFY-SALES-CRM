# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class ICCustomerProject(Document):
	def validate(self):
		self.last_activity_on = self.last_activity_on or now_datetime()
		if self.lead and (not self.customer_name or not self.company):
			lead = frappe.db.get_value(
				"IC Lead",
				self.lead,
				["customer_name", "company", "email", "phone", "country", "state", "assigned_to"],
				as_dict=True,
			)
			if lead:
				self.customer_name = self.customer_name or lead.customer_name
				self.company = self.company or lead.company
				self.email = self.email or lead.email
				self.phone = self.phone or lead.phone
				self.country = self.country or lead.country
				self.state = self.state or lead.state
				self.assigned_to = self.assigned_to or lead.assigned_to

	def before_save(self):
		if self.remarks:
			latest = max((row.remark_time for row in self.remarks if row.remark_time), default=None)
			if latest:
				self.last_activity_on = latest


def ensure_project_for_quote(quote_name: str):
	"""Get or create an open customer project for a quote/lead."""
	quote = frappe.get_doc("IC Quote", quote_name)
	project_name = None
	if quote.lead:
		project_name = frappe.db.get_value(
			"IC Customer Project",
			{"lead": quote.lead, "status": ["not in", ["Closed", "Lost"]]},
			"name",
		)
	if not project_name:
		project_name = frappe.db.get_value(
			"IC Customer Project",
			{"primary_quote": quote.name},
			"name",
		)
	if project_name:
		project = frappe.get_doc("IC Customer Project", project_name)
		if not project.primary_quote:
			project.primary_quote = quote.name
		if quote.service:
			project.service = project.service or quote.service
		project.save(ignore_permissions=True)
		return project

	title = f"{quote.company} — {quote.subject or quote.service or quote.name}"
	project = frappe.get_doc(
		{
			"doctype": "IC Customer Project",
			"project_title": title[:140],
			"status": "Quoted" if quote.status == "Shared" else "Open",
			"service": quote.service,
			"lead": quote.lead,
			"primary_quote": quote.name,
			"customer_name": quote.customer_name,
			"company": quote.company,
			"email": quote.email,
			"phone": quote.phone,
			"country": quote.country,
			"state": quote.state,
			"scope_summary": quote.description,
			"last_activity_on": now_datetime(),
		}
	)
	if quote.status == "Accepted":
		project.status = "Accepted"
	project.insert(ignore_permissions=True)
	return project


def ensure_project_for_lead(lead_name: str):
	lead = frappe.get_doc("IC Lead", lead_name)
	existing = frappe.db.get_value(
		"IC Customer Project",
		{"lead": lead.name, "status": ["not in", ["Closed", "Lost"]]},
		"name",
	)
	if existing:
		return frappe.get_doc("IC Customer Project", existing)
	project = frappe.get_doc(
		{
			"doctype": "IC Customer Project",
			"project_title": f"{lead.company} — {lead.customer_name}",
			"status": "Open",
			"lead": lead.name,
			"customer_name": lead.customer_name,
			"company": lead.company,
			"email": lead.email,
			"phone": lead.phone,
			"country": lead.country,
			"state": lead.state,
			"assigned_to": lead.assigned_to,
			"last_activity_on": now_datetime(),
		}
	)
	project.insert(ignore_permissions=True)
	return project
