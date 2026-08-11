# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_url


class ICQuote(Document):
	def validate(self):
		from instacertify_crm.quote_sections import apply_default_headers

		self.quote_number = self.quote_number or self.name
		self.quote_type = self.quote_type or "Testing"
		apply_default_headers(self)
		self._recalc_commercials()
		if self.bank_detail and not self.bank_snapshot:
			self.bank_snapshot = bank_detail_to_text(self.bank_detail)
		if self.public_token:
			self.public_url = get_url(f"/q/{self.public_token}")

	def _recalc_commercials(self):
		"""Consulting + lab/testing charges = Instacertify revenue.
		Government fees are shown on the quote but only count as revenue when marked.
		"""
		if self.quote_type == "Testing":
			if self.testing_items:
				for row in self.testing_items:
					units = flt(row.units) or 1
					if flt(row.per_unit_charges):
						row.selling_price = units * flt(row.per_unit_charges)
					if getattr(row, "counts_as_revenue", None) in (None, ""):
						row.counts_as_revenue = 1
				self.testing_price = sum(flt(row.selling_price) for row in self.testing_items)
			else:
				self.testing_price = flt(self.testing_price)
			self.consulting_price = flt(self.consulting_price)
			self.government_fees_total = 0
			gov_revenue = 0
		else:
			# Service: multi-row consulting, government fees, testing charges
			for row in self.consulting_items or []:
				if getattr(row, "counts_as_revenue", None) in (None, ""):
					row.counts_as_revenue = 1
			for row in self.service_testing_charges or []:
				if getattr(row, "counts_as_revenue", None) in (None, ""):
					row.counts_as_revenue = 1
			for row in self.government_fees or []:
				if getattr(row, "counts_as_revenue", None) in (None, ""):
					row.counts_as_revenue = 0
			self.consulting_price = sum(flt(row.amount) for row in self.consulting_items or [])
			self.government_fees_total = sum(flt(row.amount) for row in self.government_fees or [])
			self.testing_price = sum(flt(row.amount) for row in self.service_testing_charges or [])
			gov_revenue = sum(
				flt(row.amount) for row in self.government_fees or [] if flt(row.counts_as_revenue)
			)

		# Always count consulting + lab/testing as our revenue
		self.total_revenue = (
			flt(self.consulting_price)
			+ flt(self.testing_price)
			+ flt(self.other_commercials)
			+ flt(gov_revenue)
		)

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
		f"Beneficiary Name: {bank.account_name}",
		f"Bank Name: {bank.bank_name}",
		f"Account Number: {bank.account_number}",
		f"IFSC Code: {bank.ifsc}",
	]
	if getattr(bank, "swift", None):
		lines.append(f"SWIFT Code: {bank.swift}")
	if getattr(bank, "gstin", None):
		lines.append(f"GSTIN: {bank.gstin}")
	if bank.branch:
		lines.append(f"Branch Address: {bank.branch}")
	if bank.upi:
		lines.append(f"UPI: {bank.upi}")
	if bank.notes:
		lines.append(f"Note: {bank.notes}")
	return "\n".join(lines)


def on_update(doc, method=None):
	if doc.lead and doc.status in {"Shared", "Accepted"}:
		status = "QUOTE_SENT" if doc.status == "Shared" else "WON"
		frappe.db.set_value("IC Lead", doc.lead, "status", status, update_modified=False)
