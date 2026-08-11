# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import get_url, now_datetime


class ICReport(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		self.shared_on = self.shared_on or now_datetime()
		self.public_url = get_url(f"/r/{self.public_token}")

	def validate(self):
		quote_status = frappe.db.get_value("IC Quote", self.quote, "status")
		if quote_status != "Accepted":
			frappe.throw("Reports can be shared after the quote is Accepted")
		if self.public_token:
			self.public_url = get_url(f"/r/{self.public_token}")
