# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import get_url


class ICDocumentRequest(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		self.public_url = get_url(f"/d/{self.public_token}")

	def validate(self):
		if self.public_token:
			self.public_url = get_url(f"/d/{self.public_token}")
		quote_status = frappe.db.get_value("IC Quote", self.quote, "status")
		if quote_status != "Accepted" and self.is_new():
			frappe.throw("Document checklist can be shared only after quote is Accepted")
