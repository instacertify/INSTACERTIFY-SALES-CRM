# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets
from urllib.parse import quote

import frappe
from frappe.model.document import Document
from frappe.utils import get_url, now_datetime


class ICSampleRequest(Document):
	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		if not self.tracking_code:
			self.tracking_code = f"SMP-{secrets.token_hex(4).upper()}"
		self.public_url = get_url(f"/s/{self.public_token}")

	def validate(self):
		self.public_url = get_url(f"/s/{self.public_token}") if self.public_token else ""
		self.qr_html = (
			f'<img alt="Sample QR" width="140" height="140" '
			f'src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data={quote(self.public_url)}" />'
			if self.public_url
			else ""
		)

	def on_update(self):
		# stamp timestamps when status advances
		now = now_datetime()
		map_ = {
			"Sample Received": "received_on",
			"Dispatched to Lab": "dispatched_on",
			"Testing In Process": "testing_started_on",
			"Report Available": "report_ready_on",
			"Shared with Customer": "shared_on",
		}
		field = map_.get(self.status)
		if field and not self.get(field):
			self.db_set(field, now, update_modified=False)
