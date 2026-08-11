# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ICLab(Document):
	def validate(self):
		if not self.contacts:
			frappe.throw(_("Add at least one contact person for the lab"))
		primary_rows = [row for row in self.contacts if row.is_primary]
		if not primary_rows:
			self.contacts[0].is_primary = 1
			primary_rows = [self.contacts[0]]
		elif len(primary_rows) > 1:
			# Keep the first marked primary; clear the rest
			for row in primary_rows[1:]:
				row.is_primary = 0
		primary = primary_rows[0]
		self.primary_contact = primary.contact_person
		self.primary_email = primary.email
		self.primary_phone = primary.phone
