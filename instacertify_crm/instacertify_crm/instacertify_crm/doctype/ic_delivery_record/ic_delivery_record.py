# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class ICDeliveryRecord(Document):
	def validate(self):
		self.delivered_on = self.delivered_on or now_datetime()
		self.delivered_by = self.delivered_by or frappe.session.user
		self._fill_from_links()

	def _fill_from_links(self):
		if self.quote and (not self.customer_name or not self.company or not self.lead or not self.service):
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

		if self.lead and (not self.customer_name or not self.company):
			lead = frappe.db.get_value(
				"IC Lead",
				self.lead,
				["customer_name", "company", "email"],
				as_dict=True,
			)
			if lead:
				self.customer_name = self.customer_name or lead.customer_name
				self.company = self.company or lead.company
				self.email = self.email or lead.email

		if self.project and not self.lead:
			self.lead = frappe.db.get_value("IC Customer Project", self.project, "lead")

		if self.lead and not self.project:
			project = frappe.db.get_value("IC Customer Project", {"lead": self.lead, "status": ["!=", "Closed"]}, "name")
			if project:
				self.project = project

	def on_update(self):
		_touch_project(self)

	def after_insert(self):
		_touch_project(self)
		_append_project_remark(self)


def _touch_project(doc):
	if not doc.project:
		return
	frappe.db.set_value(
		"IC Customer Project",
		doc.project,
		"last_activity_on",
		doc.delivered_on or now_datetime(),
		update_modified=True,
	)


def _append_project_remark(doc):
	if not doc.project:
		return
	project = frappe.get_doc("IC Customer Project", doc.project)
	project.append(
		"remarks",
		{
			"remark_time": doc.delivered_on or now_datetime(),
			"user": doc.delivered_by or frappe.session.user,
			"stage": "Delivery" if doc.direction == "To Customer" else "Documents",
			"remark": f"{doc.delivery_type}: {doc.title}",
		},
	)
	project.flags.ignore_validate_update_after_submit = True
	project.save(ignore_permissions=True)
