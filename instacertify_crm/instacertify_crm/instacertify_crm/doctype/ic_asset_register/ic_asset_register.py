# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ICAssetRegister(Document):
	def before_insert(self):
		if not self.asset_code:
			year = frappe.utils.now_datetime().year
			count = frappe.db.count("IC Asset Register") + 1
			self.asset_code = f"AST-{year}-{count:05d}"
		if self.custodian and self.status == "Available":
			self.status = "Assigned"
