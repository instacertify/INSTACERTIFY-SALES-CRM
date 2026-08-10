// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Customer", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm.add_custom_button(__("Refresh Metrics"), () => {
			frappe.call({
				method: "instacertify_crm.customers.refresh_customer",
				args: { customer: frm.doc.name },
				freeze: true,
				callback() {
					frm.reload_doc();
				},
			});
		});

		frm
			.add_custom_button(__("Open Projects"), () => {
				frappe.set_route("List", "IC Customer Project", {
					email: frm.doc.email,
				});
			})
			.addClass("btn-primary");

		frm.add_custom_button(__("Customer Lifecycle"), () => {
			instacertify_crm.show_customer_lifecycle({
				email: frm.doc.email,
				lead: frm.doc.primary_lead,
			});
		});

		load_customer_charts(frm);
	},
});

function load_customer_charts(frm) {
	frappe.call({
		method: "instacertify_crm.customers.get_customer_chart_data",
		args: { customer: frm.doc.name },
		callback(r) {
			const data = r.message || {};
			const wrap = frm.fields_dict.dashboard_html.$wrapper;
			wrap.empty();
			wrap.html(`
				<div class="ic-customer-charts" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
					<div>
						<div class="text-muted" style="margin-bottom:6px;font-weight:600">${__("Projects by status")}</div>
						<div id="ic-cust-status-chart" style="min-height:240px"></div>
					</div>
					<div>
						<div class="text-muted" style="margin-bottom:6px;font-weight:600">${__("Value overview")}</div>
						<div id="ic-cust-value-chart" style="min-height:240px"></div>
					</div>
					<div style="grid-column:1 / -1">
						<div class="text-muted" style="margin-bottom:6px;font-weight:600">${__("Activity (last 14 days)")}</div>
						<div id="ic-cust-activity-chart" style="min-height:260px"></div>
					</div>
				</div>
				<div style="margin-top:12px" class="text-muted">
					${__("Projects")}: ${(data.projects || []).length}
					· ${__("Quotes")}: ${(data.quotes || []).length}
					· ${__("Deliveries")}: ${(data.deliveries || []).length}
				</div>
			`);

			const status = data.status_chart || { labels: [], values: [] };
			if (status.labels.length && window.frappe && frappe.Chart) {
				// eslint-disable-next-line no-new
				new frappe.Chart("#ic-cust-status-chart", {
					data: {
						labels: status.labels,
						datasets: [{ name: __("Projects"), values: status.values }],
					},
					type: "pie",
					height: 240,
					colors: ["#0A4A6C", "#EB7D2D", "#2E8B57", "#C45C26", "#5B7C99", "#8B5E3C", "#3D5A80"],
				});
			} else {
				wrap.find("#ic-cust-status-chart").html(`<div class="text-muted">${__("No project data yet")}</div>`);
			}

			const value = data.value_chart || { labels: [], values: [] };
			if (value.labels.length && frappe.Chart) {
				// eslint-disable-next-line no-new
				new frappe.Chart("#ic-cust-value-chart", {
					data: {
						labels: value.labels,
						datasets: [{ name: __("INR"), values: value.values }],
					},
					type: "bar",
					height: 240,
					colors: ["#0A4A6C"],
				});
			}

			const activity = data.activity_chart || { labels: [], datasets: [] };
			if (activity.labels.length && frappe.Chart) {
				// eslint-disable-next-line no-new
				new frappe.Chart("#ic-cust-activity-chart", {
					data: {
						labels: activity.labels,
						datasets: activity.datasets,
					},
					type: "line",
					height: 260,
					colors: ["#0A4A6C", "#EB7D2D", "#2E8B57"],
					lineOptions: { regionFill: 1, hideDots: 0 },
					axisOptions: { xIsSeries: 1 },
				});
			}
		},
	});
}
