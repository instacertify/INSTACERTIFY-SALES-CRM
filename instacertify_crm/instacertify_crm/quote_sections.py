# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

"""Testing quote section headers and field map."""

from __future__ import annotations

# Desk dropdown order for Testing quotations (customer-facing headers are editable).
TESTING_SECTION_DEFAULTS = {
	"about_header": "About",
	"standards_header": "Applicable Standard",
	"sample_requirements_header": "Sample Required",
	"commercials_header": "Commercials",
	"timeline_header": "Timeline",
	"deliverables_header": "Deliverable",
	"sample_handling_header": "Sample Handling and Disposal Policy",
	"banking_header": "Banking Details",
	"cancellation_header": "Cancellation and Refund Policy",
	"force_majeure_header": "Force Majeure",
	"confidentiality_header": "Confidentiality and Data Protection",
}

HEADER_FIELDS = list(TESTING_SECTION_DEFAULTS.keys())

TEMPLATE_COPY_FIELDS = [
	"about_header",
	"about_html",
	"standards_header",
	"standards_html",
	"accreditation_html",
	"sample_requirements_header",
	"sample_requirements_html",
	"commercials_header",
	"deliverables_header",
	"deliverables_html",
	"timeline_header",
	"timeline_html",
	"payment_terms_html",
	"sample_handling_header",
	"sample_handling_html",
	"banking_header",
	"cancellation_header",
	"cancellation_refund_html",
	"force_majeure_header",
	"force_majeure_html",
	"confidentiality_header",
	"confidentiality_html",
	"policies_html",
	"body_html",
]


def apply_default_headers(doc):
	"""Fill blank section headers with Testing defaults."""
	for field, default in TESTING_SECTION_DEFAULTS.items():
		if hasattr(doc, field) and not doc.get(field):
			doc.set(field, default)
