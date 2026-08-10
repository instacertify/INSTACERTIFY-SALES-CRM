# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class ICProjectTask(Document):
	def validate(self):
		if self.status == "Waiting" and not self.waiting_for:
			frappe.throw("Select who/what this task is Waiting For")
		if self.status != "Waiting":
			# Keep waiting_for for history when reopened; clear only if back to To Do
			pass
		if self.status == "Completed" and not self.completed_on:
			self.completed_on = now_datetime()
		if self.status != "Completed":
			self.completed_on = None

	def on_update(self):
		self._touch_project()

	def after_insert(self):
		self._touch_project()

	def _touch_project(self):
		if not self.project:
			return
		try:
			frappe.db.set_value(
				"IC Customer Project",
				self.project,
				"last_activity_on",
				now_datetime(),
				update_modified=False,
			)
			# If any open task is Waiting, mirror project-level waiting hint
			waiting_rows = frappe.get_all(
				"IC Project Task",
				filters={"project": self.project, "status": "Waiting"},
				fields=["waiting_for", "waiting_expected_on", "waiting_note"],
				order_by="modified desc",
				limit_page_length=1,
			)
			waiting = waiting_rows[0] if waiting_rows else None
			if waiting and waiting.waiting_for:
				frappe.db.set_value(
					"IC Customer Project",
					self.project,
					{
						"waiting_for": waiting.waiting_for,
						"waiting_expected_on": waiting.waiting_expected_on,
						"waiting_note": waiting.waiting_note,
					},
					update_modified=False,
				)
		except Exception:
			frappe.log_error(title="IC Project Task touch project failed")
