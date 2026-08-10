# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICLead(Document):
	def validate(self):
		if self.country == "India" and not self.state:
			frappe.throw("State is required when Country is India")


def on_update(doc, method=None):
	# Keep last_contact_on fresh when a log is added
	if doc.logs:
		latest = max((row.log_time for row in doc.logs if row.log_time), default=None)
		if latest and doc.last_contact_on != latest:
			frappe.db.set_value("IC Lead", doc.name, "last_contact_on", latest, update_modified=False)
