import frappe

IC_ROLES = ("IC Admin", "IC Sales Ops")

LEAD_SOURCES = (
	"Consultant",
	"Google Ads",
	"Phone Call",
	"IndiaMART",
	"Referral",
)

DEFAULT_SERVICES = {
	"Lab Testing": [
		"Product technical specifications",
		"User / instruction manual",
		"Sample declaration / packing list",
		"Company Incorporation Certificate",
		"GST Certificate",
		"Authorized Signatory ID proof",
	],
	"IP Testing Services": [
		"Product technical specifications",
		"Assembly / enclosure drawings",
		"User / instruction manual",
		"Sample packing list",
		"Company details",
	],
	"EPR Plastic": [
		"Company Incorporation Certificate",
		"GST Certificate",
		"PAN Card of Company",
		"Authorized Signatory Aadhaar & PAN",
		"Product details / plastic packaging data",
		"Factory / warehouse address proof",
	],
	"EPR Battery": [
		"Company Incorporation Certificate",
		"GST Certificate",
		"PAN Card",
		"Battery product catalogue",
		"Authorized Signatory ID proof",
	],
	"BIS Certification": [
		"Company details",
		"Product technical specifications",
		"Test reports (if available)",
		"Manufacturing process flow",
		"Authorized signatory documents",
	],
	"CDSCO Registration": [
		"Company Incorporation Certificate",
		"Device / product master file",
		"ISO / QMS certificates",
		"Authorized agent documents",
	],
}

SAMPLE_HANDLING_HTML = """
<ol>
<li>Samples may be subjected to destructive and/or non-destructive testing as required by the applicable standard or test protocol.</li>
<li>After completion of testing, Instacertify Labs Pvt. Ltd. shall retain remaining samples for a maximum of <strong>15 days</strong>.</li>
<li>Clients wishing to recover samples must arrange collection or request return shipment within the 15-day retention period.</li>
<li>All sample shipping, return shipping, handling, storage, customs duties, taxes, and related logistics costs shall be borne solely by the Client.</li>
<li>India return shipping arranged by Instacertify: <strong>₹450 per kg + GST</strong>.</li>
<li>Outside India return shipping: <strong>USD 90 per kg</strong>, exclusive of customs/taxes/logistics borne by the Client.</li>
<li>Unclaimed samples after 15 days may be disposed of at Instacertify’s sole discretion without further notice.</li>
<li>Instacertify is not responsible for loss, damage, delay, or deterioration during third-party courier transit.</li>
</ol>
"""

CANCELLATION_HTML = """
<p>Testing fees are payable in advance and are non-refundable once samples have been submitted or testing has commenced.
Government fees may be refunded only if they have not been deposited with the relevant authority.
Consultancy fees are charged based on work completed and are non-refundable once services have been rendered.
Any eligible refund request must be submitted in writing within 7 working days of payment.</p>
"""

FORCE_MAJEURE_HTML = """
<p>Instacertify Labs Pvt. Ltd. shall not be liable for delay or failure due to circumstances beyond reasonable control,
including natural disasters, government actions, regulatory changes, strikes, pandemics, war, civil unrest,
transportation disruptions, laboratory delays, or certification authority actions. Affected timelines shall be extended accordingly.</p>
"""

CONFIDENTIALITY_HTML = """
<p>Instacertify Labs Pvt. Ltd. shall maintain strict confidentiality of all documents, technical information, business data,
and records shared by the Client. Information will be used solely for providing the agreed services and will not be disclosed
except where required by law, regulatory authorities, laboratories, or certification bodies.</p>
"""

POLICIES_HTML = (
	"<p><strong>Cancellation & Refund Policy</strong></p>"
	+ CANCELLATION_HTML
	+ "<p><strong>Force Majeure</strong></p>"
	+ FORCE_MAJEURE_HTML
	+ "<p><strong>Confidentiality & Data Protection</strong></p>"
	+ CONFIDENTIALITY_HTML
)


def has_app_permission():
	return frappe.db.get_value(
		"Has Role",
		{"parent": frappe.session.user, "role": ["in", list(IC_ROLES) + ["System Manager"]]},
		"name",
	)


def after_install():
	ensure_roles()
	seed_masters()
	frappe.clear_cache()


def after_migrate():
	ensure_roles()
	seed_masters()
	_backfill_lead_costs()
	frappe.clear_cache()


def ensure_roles():
	for role in IC_ROLES:
		if not frappe.db.exists("Role", role):
			doc = frappe.get_doc(
				{
					"doctype": "Role",
					"role_name": role,
					"desk_access": 1,
				}
			)
			doc.insert(ignore_permissions=True)

	frappe.clear_cache()


def seed_masters():
	_seed_settings()
	_seed_labs()
	_backfill_testing_lab_links()
	for source in LEAD_SOURCES:
		if not frappe.db.exists("IC Lead Source", source):
			frappe.get_doc(
				{
					"doctype": "IC Lead Source",
					"source_name": source,
					"active": 1,
				}
			).insert(ignore_permissions=True)

	for service_name, documents in DEFAULT_SERVICES.items():
		if not frappe.db.exists("IC Service", service_name):
			frappe.get_doc(
				{
					"doctype": "IC Service",
					"service_name": service_name,
					"active": 1,
					"description": f"{service_name} support",
				}
			).insert(ignore_permissions=True)

		service = frappe.get_doc("IC Service", service_name)
		existing = {row.document_name for row in service.documents}
		changed = False
		for document_name in documents:
			if document_name not in existing:
				service.append(
					"documents",
					{
						"document_name": document_name,
						"required": 1,
						"active": 1,
					},
				)
				changed = True
		if changed:
			service.save(ignore_permissions=True)

	_seed_bank()
	_seed_testing_services()
	_seed_quote_templates()


def _backfill_lead_costs():
	"""Ensure existing leads have the default acquisition cost (₹800)."""
	if not frappe.db.exists("DocType", "IC Lead") or not frappe.db.has_column("IC Lead", "lead_cost"):
		return
	default_cost = frappe.db.get_single_value("IC Settings", "default_lead_cost") or 800
	frappe.db.sql(
		"""
		UPDATE `tabIC Lead`
		SET lead_cost = %(cost)s
		WHERE lead_cost IS NULL
		""",
		{"cost": default_cost},
	)


def _seed_settings():
	if not frappe.db.exists("DocType", "IC Settings"):
		return
	settings = frappe.get_single("IC Settings")
	changed = False
	defaults = {
		"brand_name": "Instacertify",
		"legal_name": "Instacertify Labs Pvt Ltd",
		"tagline": "certifications made simple",
		"phone": "+91 9999118039",
		"email": "contact@instacertify.com",
		"website": "www.instacertify.com",
		"address_line": "PK 1 Sector 63 A Noida, Uttar Pradesh, India - 201301",
		"cin": "UP74999UP2022PTC170291",
		"apply_logo_sitewide": 1,
		"apply_letter_head": 1,
		"default_lead_cost": 800,
	}
	for key, value in defaults.items():
		if not settings.get(key):
			settings.set(key, value)
			changed = True
	# Prefer bundled logo if nothing uploaded yet
	if not settings.company_logo:
		settings.company_logo = "/assets/instacertify_crm/images/logo.svg"
		changed = True
	if changed:
		settings.save(ignore_permissions=True)


def _seed_bank():
	existing = frappe.db.get_value("IC Bank Detail", {"is_default": 1}, "name")
	values = {
		"account_name": "Instacertify Labs Private Limited",
		"bank_name": "YES BANK",
		"account_number": "026485800001318",
		"ifsc": "YESB0000264",
		"swift": "YESBINBBDEL (For International USD Transfers)",
		"gstin": "09AAGCI8396C1Z7",
		"branch": "Ground, Mezzanine & First Floor, Plot No. 6, Basant Lok, Vasant Vihar, New Delhi, Delhi – 110057, India",
		"is_default": 1,
		"notes": "Kindly share the payment transaction details/remittance advice after making the payment.",
	}
	if existing:
		doc = frappe.get_doc("IC Bank Detail", existing)
		doc.update(values)
		doc.save(ignore_permissions=True)
	else:
		frappe.get_doc({"doctype": "IC Bank Detail", **values}).insert(ignore_permissions=True)


def _seed_labs():
	"""Lab Library profiles — contacts, location, scope, certificate slots."""
	if not frappe.db.exists("DocType", "IC Lab"):
		return
	labs = [
		{
			"lab_name": "ISO/IEC 17025 Partner Lab",
			"accreditation_body": "NABL / ISO/IEC 17025",
			"accreditation_number": "TC-XXXX",
			"address_line": "Industrial testing campus",
			"city": "Noida",
			"state": "Uttar Pradesh",
			"country": "India",
			"pincode": "201301",
			"scope": "<p>EMC, safety and ingress protection testing for AV / ICT equipment under ISO/IEC 17025.</p>",
			"contacts": [
				{
					"contact_person": "Lab Coordinator",
					"designation": "Technical Contact",
					"email": "lab@example.com",
					"phone": "+91 9999118039",
					"is_primary": 1,
				}
			],
		},
		{
			"lab_name": "BIS-recognized ISO/IEC 17025 Lab",
			"accreditation_body": "NABL + BIS recognized",
			"accreditation_number": "BIS-XXXX",
			"address_line": "BIS-recognized partner facility",
			"city": "Gurugram",
			"state": "Haryana",
			"country": "India",
			"pincode": "122001",
			"scope": "<p>IP / environmental and product safety tests for BIS CRS / ISI pathways.</p>",
			"contacts": [
				{
					"contact_person": "BIS Lab Desk",
					"designation": "Account Manager",
					"email": "bis-lab@example.com",
					"phone": "+91 9999118039",
					"is_primary": 1,
				}
			],
		},
	]
	for row in labs:
		if frappe.db.exists("IC Lab", row["lab_name"]):
			continue
		frappe.get_doc({"doctype": "IC Lab", "active": 1, **row}).insert(ignore_permissions=True)


def _backfill_testing_lab_links():
	"""Link existing testing catalog rows to Lab Library by lab name."""
	if not frappe.db.exists("DocType", "IC Lab") or not frappe.db.has_column(
		"IC Testing Service", "lab"
	):
		return
	rows = frappe.db.sql(
		"""
		SELECT name, lab_name FROM `tabIC Testing Service`
		WHERE IFNULL(lab, '') = ''
		""",
		as_dict=True,
	)
	for row in rows:
		lab_name = row.lab_name
		if not lab_name:
			continue
		if not frappe.db.exists("IC Lab", lab_name):
			frappe.get_doc(
				{
					"doctype": "IC Lab",
					"lab_name": lab_name,
					"active": 1,
					"accreditation_body": "ISO/IEC 17025",
					"address_line": "To be updated",
					"city": "To be updated",
					"country": "India",
					"scope": f"<p>Scope pending for {frappe.safe_decode(lab_name)}</p>",
					"contacts": [
						{
							"contact_person": "To be updated",
							"is_primary": 1,
						}
					],
				}
			).insert(ignore_permissions=True)
		frappe.db.set_value("IC Testing Service", row.name, "lab", lab_name, update_modified=False)


def _seed_testing_services():
	_seed_labs()
	testing_seed = [
		{
			"test_name": "Surge Immunity Test",
			"lab": "ISO/IEC 17025 Partner Lab",
			"lab_name": "ISO/IEC 17025 Partner Lab",
			"purchase_price": 12000,
			"selling_price": 20000,
			"description": "IEC 61000-4-5",
		},
		{
			"test_name": "Voltage Dips, Short Interruptions & Voltage Variations",
			"lab": "ISO/IEC 17025 Partner Lab",
			"lab_name": "ISO/IEC 17025 Partner Lab",
			"purchase_price": 12000,
			"selling_price": 20000,
			"description": "IEC 61000-4-11",
		},
		{
			"test_name": "Ingress Protection Test",
			"lab": "ISO/IEC 17025 Partner Lab",
			"lab_name": "ISO/IEC 17025 Partner Lab",
			"purchase_price": 3500,
			"selling_price": 6000,
			"description": "IP65 / IEC 60529",
		},
		{
			"test_name": "Safety Requirements for AV/ICT Equipment",
			"lab": "ISO/IEC 17025 Partner Lab",
			"lab_name": "ISO/IEC 17025 Partner Lab",
			"purchase_price": 25000,
			"selling_price": 40000,
			"description": "IS/IEC 62368-1",
		},
		{
			"test_name": "IP69 Ingress Protection Testing",
			"lab": "BIS-recognized ISO/IEC 17025 Lab",
			"lab_name": "BIS-recognized ISO/IEC 17025 Lab",
			"purchase_price": 5500,
			"selling_price": 9000,
			"description": "IEC 60529 / IS/IEC 60529",
		},
	]
	for row in testing_seed:
		name = frappe.db.exists(
			"IC Testing Service",
			{"test_name": row["test_name"], "lab_name": row["lab_name"]},
		)
		if not name:
			frappe.get_doc({"doctype": "IC Testing Service", "active": 1, **row}).insert(
				ignore_permissions=True
			)


def _seed_quote_templates():
	bank = frappe.db.get_value("IC Bank Detail", {"is_default": 1}, "name")
	templates = [
		{
			"template_name": "Testing Quotation",
			"quote_type": "Testing",
			"service": "Lab Testing",
			"subject": "Testing",
			"validity_days": 30,
			"about_html": """
<p>The proposed testing covers EMC immunity, electrical safety, and enclosure protection requirements.
<strong>IEC 61000-4-5</strong> evaluates the product’s immunity against surge voltages, while
<strong>IEC 61000-4-11</strong> assesses performance during voltage dips, short interruptions, and voltage variations.
<strong>IP65 testing</strong> verifies protection against dust ingress and water jets.
<strong>IS/IEC 62368-1</strong> evaluates applicable safety requirements for electrical/electronic equipment, including
protection against electrical, thermal, mechanical, and fire-related hazards.
Testing will be conducted as per the applicable standard requirements.</p>
""",
			"standards_html": """
<ul>
<li>IEC 61000-4-5 – Surge Immunity Test</li>
<li>IEC 61000-4-11 – Voltage Dips, Short Interruptions & Voltage Variations</li>
<li>IP65 – Ingress Protection against Dust and Water</li>
<li>IS/IEC 62368-1 – Safety Requirements for Audio/Video, Information & Communication Technology Equipment</li>
</ul>
""",
			"sample_requirements_html": """
<p><strong>Sample Required</strong></p>
<ul>
<li><strong>IEC 61000-4-5:</strong> 4 complete functional product samples, including accessories, cables, and power supply components.</li>
<li><strong>IEC 61000-4-11:</strong> 4 complete functional product samples, including required power supply, cables, and accessories.</li>
<li><strong>IP65:</strong> 4 complete and fully assembled product/enclosure samples suitable for ingress protection testing.</li>
<li><strong>IS/IEC 62368-1:</strong> 4 complete product samples, including accessories, cables, adapters, and components required for safety testing.</li>
</ul>
<p><em>Note:</em> Additional samples may be requested depending on product configuration and applicable test requirements.</p>
""",
			"deliverables_html": """
<ul>
<li>Test Report covering the applicable standards and tests performed</li>
<li>Test Results with observations and measured parameters</li>
<li>Certificate/Report of Compliance, wherever applicable</li>
</ul>
""",
			"timeline_html": """
<ul>
<li><strong>Estimated Testing Timeline:</strong> 5–7 working days</li>
<li>Timeline starts upon receipt of the required sample and confirmation of payment</li>
<li>Timeline may vary depending on laboratory scheduling, sample condition, and additional testing if applicable</li>
</ul>
""",
			"payment_terms_html": """
<ul>
<li>100% Advance Payment is required to initiate the testing process</li>
<li>Testing will commence upon receipt of the payment and sample</li>
<li>Any additional testing or charges, if applicable, shall be communicated separately</li>
<li>GST @ 18% shall be charged additionally</li>
</ul>
""",
			"sample_handling_html": SAMPLE_HANDLING_HTML,
			"about_header": "About",
			"standards_header": "Applicable Standard",
			"sample_requirements_header": "Sample Required",
			"commercials_header": "Commercials",
			"timeline_header": "Timeline",
			"deliverables_header": "Deliverable",
			"sample_handling_header": "Sample Handling and Disposal Policy",
			"banking_header": "Banking Details",
			"cancellation_header": "Cancellation and Refund Policy",
			"cancellation_refund_html": CANCELLATION_HTML,
			"force_majeure_header": "Force Majeure",
			"force_majeure_html": FORCE_MAJEURE_HTML,
			"confidentiality_header": "Confidentiality and Data Protection",
			"confidentiality_html": CONFIDENTIALITY_HTML,
			"policies_html": POLICIES_HTML,
			"bank_detail": bank,
		},
		{
			"template_name": "Service Quotation — IP Testing",
			"quote_type": "Service",
			"service": "IP Testing Services",
			"subject": "Ingress Protection (IP) Testing Services",
			"validity_days": 30,
			"testing_price": 9000,
			"about_html": """
<p><strong>Ingress Protection (IP) Testing Services</strong> evaluate the level of protection an electrical or
electronic product provides against dust and water. It is based on the IEC 60529 standard and assigns an IP rating
like IP65, IP67, etc. This testing ensures product durability, safety, and reliability in different environmental
conditions. It is commonly required for certification, quality compliance, and market approval of electronic equipment.</p>
""",
			"standards_html": """
<p>Ingress Protection (IP69) Testing will be carried out in accordance with
<strong>IEC 60529 / IS/IEC 60529</strong> to determine the degree of protection provided by the enclosure against
dust ingress and high-pressure, high-temperature water jets under specified test conditions.</p>
""",
			"accreditation_html": """
<p>Testing will be conducted in a laboratory accredited to
<strong>ISO/IEC 17025</strong> (General Requirements for the Competence of Testing and Calibration Laboratories).</p>
""",
			"sample_requirements_html": """
<p>One (01) representative product sample, complete with all necessary accessories, mounting fixtures (if applicable),
packaging, technical specifications, and user/instruction manual, shall be submitted for Ingress Protection (IP) testing.
The sample must be fully assembled and in ready-to-test condition as per IEC 60529 requirements.
Additional samples may be requested by the BIS-recognized ISO/IEC 17025 accredited laboratory, if required.</p>
""",
			"deliverables_html": """
<ul>
<li>Soft copy of the test report</li>
<li>Hard copy of the test report (if required)</li>
<li>Copy of laboratory accreditation certificate</li>
<li>Scope of accreditation document of the laboratory (if required)</li>
</ul>
""",
			"payment_terms_html": """
<ul>
<li>100% advance payment is required upon receipt of the sample</li>
<li>18% GST shall be applicable extra as per prevailing government taxation norms</li>
</ul>
""",
			"sample_handling_html": SAMPLE_HANDLING_HTML,
			"about_header": "About",
			"standards_header": "Applicable Standard",
			"sample_requirements_header": "Sample Required",
			"commercials_header": "Commercials",
			"timeline_header": "Timeline",
			"deliverables_header": "Deliverable",
			"sample_handling_header": "Sample Handling and Disposal Policy",
			"banking_header": "Banking Details",
			"cancellation_header": "Cancellation and Refund Policy",
			"cancellation_refund_html": CANCELLATION_HTML,
			"force_majeure_header": "Force Majeure",
			"force_majeure_html": FORCE_MAJEURE_HTML,
			"confidentiality_header": "Confidentiality and Data Protection",
			"confidentiality_html": CONFIDENTIALITY_HTML,
			"policies_html": POLICIES_HTML,
			"bank_detail": bank,
		},
	]

	for row in templates:
		name = row["template_name"]
		if frappe.db.exists("IC Quote Template", name):
			doc = frappe.get_doc("IC Quote Template", name)
			doc.update(row)
			doc.save(ignore_permissions=True)
		else:
			frappe.get_doc({"doctype": "IC Quote Template", **row}).insert(ignore_permissions=True)
