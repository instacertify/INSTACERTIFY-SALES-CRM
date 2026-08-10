# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, now_datetime


class ICCustomer(Document):
	def validate(self):
		self.email = (self.email or "").strip().lower()
		if not self.email:
			frappe.throw("Email is required")
		self.refresh_metrics(save=False)

	def refresh_metrics(self, save: bool = False):
		email = self.email
		if not email:
			return

		projects = frappe.get_all(
			"IC Customer Project",
			filters={"email": email},
			fields=["name", "status", "project_value", "last_activity_on", "modified"],
		)
		terminal = {"Completed", "Closed", "Lost"}
		self.total_projects = len(projects)
		self.active_projects = sum(1 for p in projects if p.status not in terminal)
		self.lifetime_value = sum(flt(p.project_value) for p in projects)

		quotes = frappe.get_all(
			"IC Quote",
			filters={"email": email},
			fields=["name", "status", "total_revenue"],
		)
		self.total_quotes = len(quotes)
		self.won_value = sum(
			flt(q.total_revenue) for q in quotes if q.status in {"Accepted", "Delivered"}
		)

		activity_candidates = [p.last_activity_on or p.modified for p in projects if p.last_activity_on or p.modified]
		if activity_candidates:
			self.last_activity_on = max(activity_candidates)
		elif not self.last_activity_on:
			self.last_activity_on = now_datetime()

		if not self.primary_lead:
			leads = frappe.get_all(
				"IC Lead",
				filters={"email": email},
				pluck="name",
				order_by="creation desc",
				limit_page_length=1,
			)
			if leads:
				self.primary_lead = leads[0]

		if save and not self.is_new():
			self.db_set(
				{
					"active_projects": self.active_projects,
					"total_projects": self.total_projects,
					"total_quotes": self.total_quotes,
					"lifetime_value": self.lifetime_value,
					"won_value": self.won_value,
					"last_activity_on": self.last_activity_on,
					"primary_lead": self.primary_lead,
				},
				update_modified=False,
			)
