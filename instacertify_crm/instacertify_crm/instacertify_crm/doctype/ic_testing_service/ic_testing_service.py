# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICTestingService(Document):
	def validate(self):
		if self.lab:
			lab = frappe.db.get_value(
				"IC Lab",
				self.lab,
				["lab_name", "city", "primary_contact", "primary_phone", "active"],
				as_dict=True,
			)
			if lab:
				self.lab_name = lab.lab_name
				self.lab_city = lab.city
				self.lab_contact = lab.primary_contact
				self.lab_phone = lab.primary_phone
				if not lab.active:
					frappe.msgprint(frappe._("Selected lab is marked inactive"))
