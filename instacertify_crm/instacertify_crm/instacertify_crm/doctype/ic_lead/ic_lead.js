// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Lead", {
	refresh(frm) {
		toggle_state(frm);
		if (!frm.is_new()) {
			frm
				.add_custom_button(__("Create Quote"), () => {
					frappe.new_doc("IC Quote", {
						lead: frm.doc.name,
						customer_name: frm.doc.customer_name,
						company: frm.doc.company,
						email: frm.doc.email,
						phone: frm.doc.phone,
						country: frm.doc.country,
						state: frm.doc.state,
						service: frm.doc.service,
						quote_type: "Testing",
					});
				})
				.addClass("btn-primary");
			frm.add_custom_button(__("Customer History"), () => {
				instacertify_crm.show_customer_history({ lead: frm.doc.name });
			});
			frm
				.add_custom_button(__("Customer Lifecycle"), () => {
					instacertify_crm.show_customer_lifecycle({ lead: frm.doc.name });
				})
				.addClass("btn-primary");
			frm.add_custom_button(__("Open / Create Project"), () => {
				frappe.call({
					method: "instacertify_crm.api.ensure_customer_project",
					args: { lead: frm.doc.name },
					freeze: true,
					callback(r) {
						if (r.message?.name) {
							frappe.set_route("Form", "IC Customer Project", r.message.name);
						}
					},
				});
			});
			frm.add_custom_button(__("Log Delivery Record"), () => {
				frappe.new_doc("IC Delivery Record", {
					lead: frm.doc.name,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					direction: "To Customer",
					delivery_type: "Service Delivered",
				});
			});
			frm
				.add_custom_button(__("Assign Lead / Project"), () => {
					instacertify_crm.assign_dialog({
						title: __("Assign lead"),
						method: "instacertify_crm.assignments.assign_lead",
						docfield: "lead",
						name: frm.doc.name,
						current: frm.doc.assigned_to,
						on_success() {
							frm.reload_doc();
						},
					});
				})
				.addClass("btn-primary");
			if (frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager")) {
				frm.add_custom_button(__("Team Workload"), () => {
					frappe.set_route("query-report", "IC Team Lead Workload");
				});
				frm.add_custom_button(__("Lead Cost Spend"), () => {
					frappe.set_route("query-report", "IC Lead Cost Spend");
				});
			}
			load_history_section(frm);
		}
	},
	country(frm) {
		toggle_state(frm);
	},
});

frappe.listview_settings["IC Lead"] = {
	add_fields: ["assigned_to", "status", "follow_up_on", "lead_cost"],
	hide_name_column: false,
	onload(listview) {
		if (frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager")) {
			listview.page.add_inner_button(__("Team Workload"), () => {
				frappe.set_route("query-report", "IC Team Lead Workload");
			});
			listview.page.add_inner_button(__("Workload Snapshot"), () => {
				instacertify_crm.show_team_workload();
			});
			listview.page.add_inner_button(__("Lead Cost Spend"), () => {
				instacertify_crm.show_lead_cost_spend();
			});
		}
	},
	formatters: {
		assigned_to(value) {
			return value || `<span class="text-muted">${__("Unassigned")}</span>`;
		},
	},
};

function toggle_state(frm) {
	const india = frm.doc.country === "India";
	frm.toggle_reqd("state", india);
	frm.set_df_property(
		"state",
		"description",
		india ? "Select / enter Indian state (required)" : "Optional state / region",
	);
}

function load_history_section(frm) {
	frappe.call({
		method: "instacertify_crm.api.get_customer_history",
		args: { lead: frm.doc.name },
		callback(r) {
			const html = instacertify_crm.render_customer_history(r.message || {});
			frm.dashboard.clear_headline();
			frm.dashboard.add_section(html, __("Past services, testing & reports"));
		},
	});
}
