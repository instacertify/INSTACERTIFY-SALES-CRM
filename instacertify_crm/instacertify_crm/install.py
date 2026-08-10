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

	# Permissions come from DocType JSON; clear cache so roles apply immediately.
	frappe.clear_cache()


def seed_masters():
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
					"description": f"{service_name} certification / compliance support",
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

	if not frappe.db.exists("IC Bank Detail", {"is_default": 1}):
		frappe.get_doc(
			{
				"doctype": "IC Bank Detail",
				"account_name": "Instacertify Labs Pvt Ltd",
				"bank_name": "HDFC Bank",
				"account_number": "50200012345678",
				"ifsc": "HDFC0001234",
				"branch": "New Delhi",
				"upi": "instacertify@hdfcbank",
				"is_default": 1,
				"notes": "Please mention quote number in payment reference.",
			}
		).insert(ignore_permissions=True)

	testing_seed = [
		{
			"test_name": "RoHS Testing - Electronics",
			"lab_name": "NABL Lab A",
			"purchase_price": 4500,
			"selling_price": 7500,
		},
		{
			"test_name": "Plastic Composition Analysis",
			"lab_name": "NABL Lab B",
			"purchase_price": 3200,
			"selling_price": 6000,
		},
		{
			"test_name": "Heavy Metal Testing",
			"lab_name": "Instacertify Partner Lab",
			"purchase_price": 2800,
			"selling_price": 5500,
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
