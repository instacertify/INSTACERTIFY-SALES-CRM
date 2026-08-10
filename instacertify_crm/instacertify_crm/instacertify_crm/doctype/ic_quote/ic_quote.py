# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_url


class ICQuote(Document):
	def validate(self):
		self.quote_number = self.quote_number or self.name
		self.total_revenue = flt(self.consulting_price) + flt(self.testing_price) + flt(self.other_commercials)
		if self.testing_items:
			self.testing_price = sum(flt(row.selling_price) for row in self.testing_items)
			self.total_revenue = flt(self.consulting_price) + flt(self.testing_price) + flt(self.other_commercials)
		if self.bank_detail and not self.bank_snapshot:
			self.bank_snapshot = bank_detail_to_text(self.bank_detail)
		if self.public_token:
			self.public_url = get_url(f"/q/{self.public_token}")

	def before_insert(self):
		if not self.public_token:
			self.public_token = secrets.token_hex(16)
		if not self.bank_detail:
			default_bank = frappe.db.get_value("IC Bank Detail", {"is_default": 1}, "name")
			if default_bank:
				self.bank_detail = default_bank
				self.bank_snapshot = bank_detail_to_text(default_bank)


def bank_detail_to_text(bank_name: str) -> str:
	bank = frappe.get_doc("IC Bank Detail", bank_name)
	lines = [
		f"Account Name: {bank.account_name}",
		f"Bank: {bank.bank_name}",
		f"Account Number: {bank.account_number}",
		f"IFSC: {bank.ifsc}",
	]
	if bank.branch:
		lines.append(f"Branch: {bank.branch}")
	if bank.upi:
		lines.append(f"UPI: {bank.upi}")
	if bank.notes:
		lines.append(f"Note: {bank.notes}")
	return "\n".join(lines)


def on_update(doc, method=None):
	if doc.lead and doc.status in {"Shared", "Accepted"}:
		status = "QUOTE_SENT" if doc.status == "Shared" else "WON"
		frappe.db.set_value("IC Lead", doc.lead, "status", status, update_modified=False)
