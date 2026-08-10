# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, now_datetime, today


class ICCustomerProject(Document):
	def validate(self):
		self.last_activity_on = self.last_activity_on or now_datetime()
		self._sync_owners()
		if self.lead and (not self.customer_name or not self.company):
			lead = frappe.db.get_value(
				"IC Lead",
				self.lead,
				[
					"customer_name",
					"company",
					"email",
					"phone",
					"country",
					"state",
					"assigned_to",
				],
				as_dict=True,
			)
			if lead:
				self.customer_name = self.customer_name or lead.customer_name
				self.company = self.company or lead.company
				self.email = self.email or lead.email
				self.phone = self.phone or lead.phone
				self.country = self.country or lead.country
				self.state = self.state or lead.state
				self.commercial_owner = self.commercial_owner or lead.assigned_to
				self.delivery_owner = self.delivery_owner or lead.assigned_to
				self.assigned_to = self.assigned_to or lead.assigned_to
		if not self.start_date and self.status not in {"Not Started", "Quoted", "Lost"}:
			self.start_date = getdate(today())

	def before_save(self):
		self._sync_owners()
		if self.remarks:
			latest = max((row.remark_time for row in self.remarks if row.remark_time), default=None)
			if latest:
				self.last_activity_on = latest

	def _sync_owners(self):
		"""Keep assigned_to aligned with delivery_owner for legacy reports."""
		if self.delivery_owner:
			self.assigned_to = self.delivery_owner
		elif self.assigned_to and not self.delivery_owner:
			self.delivery_owner = self.assigned_to
		if not self.commercial_owner and self.assigned_to:
			self.commercial_owner = self.assigned_to


def ensure_project_for_quote(quote_name: str):
	"""Get or create an open customer project for a quote/lead."""
	quote = frappe.get_doc("IC Quote", quote_name)
	project_name = None
	if quote.lead:
		project_name = frappe.db.get_value(
			"IC Customer Project",
			{"lead": quote.lead, "status": ["not in", ["Completed", "Closed", "Lost"]]},
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
		updates = {}
		if not project.primary_quote:
			updates["primary_quote"] = quote.name
		if quote.service and not project.service:
			updates["service"] = quote.service
		if flt(quote.total_revenue) and not flt(project.project_value):
			updates["project_value"] = quote.total_revenue
		commercial = _lead_assignee(quote.lead)
		if commercial and not project.commercial_owner:
			updates["commercial_owner"] = commercial
		if commercial and not project.delivery_owner:
			updates["delivery_owner"] = commercial
			updates["assigned_to"] = commercial
		if updates:
			project.db_set(updates, update_modified=False)
			project.reload()
		return project

	commercial = _lead_assignee(quote.lead)
	title = f"{quote.company} — {quote.subject or quote.service or quote.name}"
	status = "Quoted" if quote.status == "Shared" else "Not Started"
	if quote.status == "Accepted":
		status = "Accepted"
	project = frappe.get_doc(
		{
			"doctype": "IC Customer Project",
			"project_title": title[:140],
			"status": status,
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
			"project_value": quote.total_revenue,
			"commercial_owner": commercial,
			"delivery_owner": commercial,
			"assigned_to": commercial,
			"start_date": getdate(today()) if quote.status == "Accepted" else None,
			"last_activity_on": now_datetime(),
		}
	)
	project.insert(ignore_permissions=True)
	return project


def ensure_project_for_lead(lead_name: str):
	lead = frappe.get_doc("IC Lead", lead_name)
	existing = frappe.db.get_value(
		"IC Customer Project",
		{"lead": lead.name, "status": ["not in", ["Completed", "Closed", "Lost"]]},
		"name",
	)
	if existing:
		return frappe.get_doc("IC Customer Project", existing)

	status = "Accepted" if lead.status == "WON" else "Not Started"
	project = frappe.get_doc(
		{
			"doctype": "IC Customer Project",
			"project_title": f"{lead.company} — {lead.customer_name}",
			"status": status,
			"service": getattr(lead, "service", None),
			"lead": lead.name,
			"customer_name": lead.customer_name,
			"company": lead.company,
			"email": lead.email,
			"phone": lead.phone,
			"country": lead.country,
			"state": lead.state,
			"commercial_owner": lead.assigned_to,
			"delivery_owner": lead.assigned_to,
			"assigned_to": lead.assigned_to,
			"project_value": getattr(lead, "expected_value", None),
			"expected_completion": getattr(lead, "expected_closing", None),
			"start_date": getdate(today()) if lead.status == "WON" else None,
			"last_activity_on": now_datetime(),
		}
	)
	project.insert(ignore_permissions=True)
	return project


def _lead_assignee(lead_name: str | None):
	if not lead_name:
		return None
	return frappe.db.get_value("IC Lead", lead_name, "assigned_to")
