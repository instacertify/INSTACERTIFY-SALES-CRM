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
		_schedule_renewals(self)

	def after_insert(self):
		_touch_project(self)
		_append_project_remark(self)
		_schedule_renewals(self)


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


def _schedule_renewals(doc):
	if not (doc.remind_6_months or doc.remind_1_year or doc.custom_renewal_on):
		return
	assigned = None
	if doc.lead:
		assigned = frappe.db.get_value("IC Lead", doc.lead, "assigned_to")
	from instacertify_crm.instacertify_crm.doctype.ic_renewal_reminder.ic_renewal_reminder import (
		schedule_renewal_reminders,
	)

	schedule_renewal_reminders(
		delivery=doc.name,
		quote=doc.quote,
		lead=doc.lead,
		project=doc.project,
		service=doc.service,
		customer_name=doc.customer_name,
		company=doc.company,
		email=doc.email,
		assigned_to=assigned or doc.delivered_by,
		remind_6_months=doc.remind_6_months,
		remind_1_year=doc.remind_1_year,
		custom_renewal_on=doc.custom_renewal_on,
		base_date=doc.delivered_on,
		notes=doc.remarks,
	)
