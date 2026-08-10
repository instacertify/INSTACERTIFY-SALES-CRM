# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Quote section headers for Testing and Service quotations."""

from __future__ import annotations

# Shared defaults; About header text differs by quote type.
SHARED_SECTION_DEFAULTS = {
	"standards_header": "Applicable Standard",
	"timeline_header": "Timeline",
	"commercials_header": "Commercials",
	"payment_terms_header": "Payment Terms",
	"banking_header": "Our Banking Details",
	"sample_handling_header": "Sample Handling and Disposal Policy",
	"cancellation_header": "Cancellation and Refund Policy",
	"force_majeure_header": "Force Majeure",
	"confidentiality_header": "Confidentiality and Data Protection",
	"deliverables_header": "Deliverable",
}

TESTING_ABOUT_HEADER = "About"
SERVICE_ABOUT_HEADER = "About Service"
TESTING_SAMPLE_HEADER = "Sample Required"
SERVICE_SAMPLE_HEADER = "Samples Required"

TEMPLATE_COPY_FIELDS = [
	"about_header",
	"about_html",
	"standards_header",
	"standards_html",
	"accreditation_html",
	"timeline_header",
	"timeline_html",
	"commercials_header",
	"payment_terms_header",
	"payment_terms_html",
	"banking_header",
	"sample_requirements_header",
	"sample_requirements_html",
	"sample_handling_header",
	"sample_handling_html",
	"cancellation_header",
	"cancellation_refund_html",
	"force_majeure_header",
	"force_majeure_html",
	"confidentiality_header",
	"confidentiality_html",
	"deliverables_header",
	"deliverables_html",
	"policies_html",
	"body_html",
]


def apply_default_headers(doc):
	"""Fill blank section headers based on quote type."""
	quote_type = getattr(doc, "quote_type", None) or "Testing"
	about_default = SERVICE_ABOUT_HEADER if quote_type == "Service" else TESTING_ABOUT_HEADER
	if hasattr(doc, "about_header") and not doc.get("about_header"):
		doc.set("about_header", about_default)
	# If switching types and still on the other type's default, refresh About header
	elif quote_type == "Service" and doc.get("about_header") == TESTING_ABOUT_HEADER:
		doc.set("about_header", SERVICE_ABOUT_HEADER)
	elif quote_type == "Testing" and doc.get("about_header") == SERVICE_ABOUT_HEADER:
		doc.set("about_header", TESTING_ABOUT_HEADER)

	sample_default = SERVICE_SAMPLE_HEADER if quote_type == "Service" else TESTING_SAMPLE_HEADER
	if hasattr(doc, "sample_requirements_header"):
		current_sample = doc.get("sample_requirements_header")
		if not current_sample:
			doc.set("sample_requirements_header", sample_default)
		elif quote_type == "Service" and current_sample == TESTING_SAMPLE_HEADER:
			doc.set("sample_requirements_header", SERVICE_SAMPLE_HEADER)
		elif quote_type == "Testing" and current_sample == SERVICE_SAMPLE_HEADER:
			doc.set("sample_requirements_header", TESTING_SAMPLE_HEADER)

	for field, default in SHARED_SECTION_DEFAULTS.items():
		if hasattr(doc, field) and not doc.get(field):
			doc.set(field, default)
