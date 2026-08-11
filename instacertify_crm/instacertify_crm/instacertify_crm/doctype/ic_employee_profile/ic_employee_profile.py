# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets
from urllib.parse import quote

import frappe
from frappe.model.document import Document
from frappe.utils import get_url


class ICEmployeeProfile(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(12)
		if not self.employee_code:
			year = frappe.utils.now_datetime().year
			count = frappe.db.count("IC Employee Profile") + 1
			self.employee_code = f"EMP-{year}-{count:04d}"

	def validate(self):
		url = get_url(f"/emp/{self.public_token}") if self.public_token else ""
		self.joining_letter_qr = (
			f'<img alt="Joining QR" width="120" height="120" '
			f'src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={quote(url)}" />'
			if url
			else ""
		)
