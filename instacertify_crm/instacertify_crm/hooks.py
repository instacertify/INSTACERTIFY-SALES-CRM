app_name = "instacertify_crm"
app_title = "Instacertify CRM"
app_publisher = "Instacertify Labs Pvt Ltd"
app_description = "Sales, quotes, documents and reports CRM for Instacertify on ERPNext 16"
app_email = "admin@instacertify.in"
app_license = "mit"
app_version = "0.0.1"

# Apps required on the bench
required_apps = ["erpnext"]

add_to_apps_screen = [
	{
		"name": "instacertify_crm",
		"logo": "/assets/instacertify_crm/images/logo.svg",
		"title": "Instacertify CRM",
		"route": "/desk/instacertify-crm",
		"has_permission": "instacertify_crm.install.has_app_permission",
	}
]

app_include_css = "/assets/instacertify_crm/css/instacertify_crm.css"
app_include_js = "/assets/instacertify_crm/js/instacertify_crm.js"

website_route_rules = [
	{"from_route": "/q/<path:token>", "to_route": "q"},
	{"from_route": "/d/<path:token>", "to_route": "d"},
	{"from_route": "/r/<path:token>", "to_route": "r"},
]

fixtures = [
	{
		"dt": "Role",
		"filters": [["name", "in", ["IC Admin", "IC Sales Ops"]]],
	},
]

after_install = "instacertify_crm.install.after_install"
after_migrate = "instacertify_crm.install.after_migrate"

doc_events = {
	"IC Quote": {
		"on_update": [
			"instacertify_crm.instacertify_crm.doctype.ic_quote.ic_quote.on_update",
			"instacertify_crm.lifecycle.on_quote_update",
		],
	},
	"IC Report": {
		"on_update": "instacertify_crm.lifecycle.on_report_update",
		"after_insert": "instacertify_crm.lifecycle.on_report_update",
	},
	"IC Document Request": {
		"on_update": "instacertify_crm.lifecycle.on_document_request_update",
	},
}

scheduler_events = {
	"daily": [
		"instacertify_crm.tasks.send_followup_reminders",
		"instacertify_crm.tasks.send_renewal_reminders",
	],
}
