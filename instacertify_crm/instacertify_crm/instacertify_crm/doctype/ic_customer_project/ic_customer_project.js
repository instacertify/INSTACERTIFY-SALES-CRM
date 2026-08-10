// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Customer Project", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm
			.add_custom_button(__("Add Task"), () => {
				frappe.new_doc("IC Project Task", {
					project: frm.doc.name,
					assigned_to: frm.doc.delivery_owner || frm.doc.assigned_to,
				});
			})
			.addClass("btn-primary");

		frm.add_custom_button(__("Log Communication"), () => {
			const d = new frappe.ui.Dialog({
				title: __("Log communication"),
				fields: [
					{
						fieldname: "stage",
						label: __("Stage"),
						fieldtype: "Select",
						options: "\nLead\nQuote\nDocuments\nDelivery\nReport\nFollow-up\nOther",
						default: "Other",
					},
					{
						fieldname: "remark",
						label: __("Note"),
						fieldtype: "Small Text",
						reqd: 1,
					},
				],
				primary_action_label: __("Save"),
				primary_action(values) {
					frm.add_child("remarks", {
						remark_time: frappe.datetime.now_datetime(),
						user: frappe.session.user,
						stage: values.stage,
						remark: values.remark,
					});
					frm.save().then(() => d.hide());
				},
			});
			d.show();
		});

		frm
			.add_custom_button(__("Log Delivery / Shared Record"), () => {
				frappe.new_doc("IC Delivery Record", {
					project: frm.doc.name,
					lead: frm.doc.lead,
					quote: frm.doc.primary_quote,
					service: frm.doc.service,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					direction: "To Customer",
					delivery_type: "Service Delivered",
				});
			});

		frm.add_custom_button(__("Log Customer Data Received"), () => {
			frappe.new_doc("IC Delivery Record", {
				project: frm.doc.name,
				lead: frm.doc.lead,
				quote: frm.doc.primary_quote,
				service: frm.doc.service,
				customer_name: frm.doc.customer_name,
				company: frm.doc.company,
				email: frm.doc.email,
				direction: "From Customer",
				delivery_type: "Customer Data Received",
			});
		});

		frm.add_custom_button(__("Customer Lifecycle"), () => {
			instacertify_crm.show_customer_lifecycle({
				project: frm.doc.name,
				lead: frm.doc.lead,
			});
		});

		if (frm.doc.lead) {
			frm.add_custom_button(__("Open Lead"), () => {
				frappe.set_route("Form", "IC Lead", frm.doc.lead);
			});
		}
		if (frm.doc.primary_quote) {
			frm.add_custom_button(__("Open Quote"), () => {
				frappe.set_route("Form", "IC Quote", frm.doc.primary_quote);
			});
		}

		frm
			.add_custom_button(__("Assign Delivery Owner"), () => {
				instacertify_crm.assign_dialog({
					title: __("Assign delivery owner"),
					method: "instacertify_crm.assignments.assign_project",
					docfield: "project",
					name: frm.doc.name,
					current: frm.doc.delivery_owner || frm.doc.assigned_to,
					on_success() {
						frm.reload_doc();
					},
				});
			})
			.addClass("btn-primary");

		load_control_tower(frm);
	},

	delivery_owner(frm) {
		if (frm.doc.delivery_owner) {
			frm.set_value("assigned_to", frm.doc.delivery_owner);
		}
	},

	lead(frm) {
		if (!frm.doc.lead) return;
		frappe.db.get_doc("IC Lead", frm.doc.lead).then((l) => {
			frm.set_value({
				customer_name: l.customer_name,
				company: l.company,
				email: l.email,
				phone: l.phone,
				country: l.country,
				state: l.state,
				commercial_owner: frm.doc.commercial_owner || l.assigned_to,
				delivery_owner: frm.doc.delivery_owner || l.assigned_to,
				assigned_to: frm.doc.assigned_to || l.assigned_to,
				service: frm.doc.service || l.service,
				project_value: frm.doc.project_value || l.expected_value,
				expected_completion: frm.doc.expected_completion || l.expected_closing,
				project_title: frm.doc.project_title || `${l.company} — ${l.customer_name}`,
			});
		});
	},
});

function load_control_tower(frm) {
	frappe.call({
		method: "instacertify_crm.api.get_project_control_tower",
		args: { project: frm.doc.name },
		callback(r) {
			const html = instacertify_crm.render_control_tower(r.message || {});
			frm.dashboard.clear_headline();
			frm.dashboard.add_section(html, __("Project Control Tower"));
		},
	});
}
