// Instacertify CRM desk helpers for ERPNext 16
frappe.provide("instacertify_crm");

$(document).on("app_ready", function () {
	instacertify_crm.mount_greeting();
});

instacertify_crm.mount_greeting = function () {
	if (!frappe.session?.user || frappe.session.user === "Guest") return;
	if (document.getElementById("ic-greeting")) return;
	const host =
		document.querySelector(".layout-main-section") ||
		document.querySelector(".body-sidebar-container")?.parentElement ||
		document.querySelector(".content.page-container");
	if (!host) return;
	frappe.call({
		method: "instacertify_crm.api.my_dashboard",
		callback(r) {
			const d = r.message || {};
			const el = document.createElement("div");
			el.id = "ic-greeting";
			el.className = "ic-greeting";
			el.innerHTML = `
				<h2>${__("Hi {0}", [frappe.utils.escape_html(frappe.boot.user?.first_name || frappe.session.user_fullname || frappe.session.user)])}</h2>
				<p>${__("Your Instacertify desk — pending work and progress in blue & orange.")}</p>
				<div class="ic-greeting-stats">
					<span class="chip">${__("Leads")}: ${d.my_leads || 0}</span>
					<span class="chip">${__("Open quotes")}: ${d.my_open_quotes || 0}</span>
					<span class="chip">${__("Projects")}: ${d.my_projects || 0}</span>
					<span class="chip">${__("Pending samples")}: ${d.my_pending_samples || 0}</span>
					<span class="chip">${__("Tasks / hours today")}: ${d.hours_today || 0}</span>
				</div>`;
			host.prepend(el);
		},
	});
};

instacertify_crm.copy_text = async function (text) {
	await navigator.clipboard.writeText(text);
	frappe.show_alert({ message: __("Copied"), indicator: "green" });
};

instacertify_crm.assign_dialog = function (opts) {
	/** Assign a lead or project to any team member. Admins can always assign. */
	const d = new frappe.ui.Dialog({
		title: opts.title || __("Assign to teammate"),
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "help",
				options: `<p class="text-muted">${__(
					"Any team member can assign. If you cannot save the assignment, ask an IC Admin.",
				)}</p>`,
			},
			{
				fieldname: "user",
				label: __("Assign To"),
				fieldtype: "Link",
				options: "User",
				default: opts.current || "",
				get_query() {
					return {
						query: "frappe.core.doctype.user.user.user_query",
						filters: { ignore_user_type: 1 },
					};
				},
			},
		],
		primary_action_label: __("Assign"),
		primary_action(values) {
			frappe.call({
				method: opts.method,
				args: {
					[opts.docfield]: opts.name,
					user: values.user || null,
				},
				freeze: true,
				callback(r) {
					d.hide();
					frappe.show_alert({
						message: values.user ? __("Assigned") : __("Unassigned"),
						indicator: "green",
					});
					if (opts.on_success) opts.on_success(r.message);
				},
				error() {
					frappe.msgprint({
						title: __("Could not assign"),
						message: __(
							"You may not have permission on this record. Ask an IC Admin to assign it.",
						),
						indicator: "orange",
					});
				},
			});
		},
	});
	d.show();
};

instacertify_crm.is_admin = function () {
	return (
		frappe.user.has_role("IC Admin") ||
		frappe.user.has_role("IC All Ops Manager") ||
		frappe.user.has_role("System Manager")
	);
};

instacertify_crm.show_team_workload = function () {
	if (!instacertify_crm.is_admin()) {
		frappe.msgprint(__("Only IC Admin can view team workload"));
		return;
	}
	frappe.call({
		method: "instacertify_crm.api.get_team_workload",
		args: { group_by: "Assigned To", active_only: 1 },
		freeze: true,
		callback(r) {
			const data = r.message || {};
			const rows = data.rows || [];
			const summary = data.summary || [];
			const summaryHtml = summary
				.map(
					(s) =>
						`<div style="min-width:120px"><div class="text-muted">${frappe.utils.escape_html(
							s.label || "",
						)}</div><div style="font-size:20px;font-weight:700">${s.value ?? 0}</div></div>`,
				)
				.join("");
			const tableRows = rows.length
				? rows
						.map(
							(row) => `<tr>
					<td>${frappe.utils.escape_html(row.full_name || row.user || __("Unassigned"))}</td>
					<td class="text-right"><strong>${row.active_leads || 0}</strong></td>
					<td class="text-right">${row.new || 0}</td>
					<td class="text-right">${row.contacted || 0}</td>
					<td class="text-right">${row.follow_up || 0}</td>
					<td class="text-right">${row.quote_sent || 0}</td>
					<td class="text-right">${row.open_followups || 0}</td>
				</tr>`,
						)
						.join("")
				: `<tr><td colspan="7" class="text-muted">${__("No active leads found.")}</td></tr>`;
			const html = `
				<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px">${summaryHtml}</div>
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>${__("Team Member")}</th>
							<th class="text-right">${__("Active")}</th>
							<th class="text-right">${__("New")}</th>
							<th class="text-right">${__("Contacted")}</th>
							<th class="text-right">${__("Follow Up")}</th>
							<th class="text-right">${__("Quote Sent")}</th>
							<th class="text-right">${__("Follow-ups set")}</th>
						</tr>
					</thead>
					<tbody>${tableRows}</tbody>
				</table>
				<p class="text-muted">${__(
					"Admins also get alerts when leads are reassigned or change status.",
				)}</p>`;
			const d = new frappe.ui.Dialog({
				title: __("Team lead workload"),
				size: "extra-large",
				fields: [{ fieldtype: "HTML", fieldname: "body" }],
				primary_action_label: __("Open full report"),
				primary_action() {
					d.hide();
					frappe.set_route("query-report", "IC Team Lead Workload");
				},
			});
			d.fields_dict.body.$wrapper.html(html);
			d.show();
		},
	});
};

instacertify_crm.render_customer_history = function (data) {
	const quotes = data.quotes || [];
	if (!quotes.length) {
		return `<div class="text-muted">${__("No past quotes, testing or reports for this customer yet.")}</div>`;
	}
	const rows = quotes
		.map((q) => {
			const tests = (q.testing_items || [])
				.map(
					(t) =>
						`<li>${frappe.utils.escape_html(t.applicable_standard || "")} ${frappe.utils.escape_html(
							t.test_name || "",
						)} — ${format_currency(t.selling_price)}</li>`,
				)
				.join("");
			const reports = (q.reports || [])
				.map(
					(r) =>
						`<li><a href="/app/ic-report/${encodeURIComponent(r.name)}">${frappe.utils.escape_html(
							r.title || r.name,
						)}</a> (${frappe.utils.escape_html(r.status || "")})</li>`,
				)
				.join("");
			return `<div style="border:1px solid var(--border-color);border-radius:10px;padding:12px;margin:8px 0">
				<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
					<div>
						<a href="/app/ic-quote/${encodeURIComponent(q.name)}"><strong>${frappe.utils.escape_html(
							q.quote_number || q.name,
						)}</strong></a>
						<span class="indicator-pill ${q.status === "Accepted" ? "green" : "orange"}">${frappe.utils.escape_html(
							q.status || "",
						)}</span>
						<div class="text-muted">${frappe.utils.escape_html(q.quote_type || "")} · ${frappe.utils.escape_html(
							q.service || "",
						)}</div>
						<div>${frappe.utils.escape_html(q.subject || q.description || "")}</div>
					</div>
					<div class="text-right"><strong>${format_currency(q.total_revenue)}</strong></div>
				</div>
				${tests ? `<div style="margin-top:8px"><strong>${__("Testing / work provided")}</strong><ul>${tests}</ul></div>` : ""}
				${reports ? `<div style="margin-top:8px"><strong>${__("Reports shared")}</strong><ul>${reports}</ul></div>` : ""}
			</div>`;
		})
		.join("");
	const totals = data.totals || {};
	return `<div>
		<div class="text-muted" style="margin-bottom:8px">
			${__("Quotes")}: ${totals.quotes || 0} · ${__("Accepted")}: ${totals.accepted || 0} · ${__("Reports")}: ${
				totals.reports || 0
			}
		</div>
		${rows}
	</div>`;
};

instacertify_crm.show_customer_history = function (args) {
	frappe.call({
		method: "instacertify_crm.api.get_customer_history",
		args,
		freeze: true,
		callback(r) {
			const d = new frappe.ui.Dialog({
				title: __("Customer past logs"),
				size: "large",
				fields: [{ fieldtype: "HTML", fieldname: "history" }],
			});
			d.fields_dict.history.$wrapper.html(
				instacertify_crm.render_customer_history(r.message || {}),
			);
			d.show();
		},
	});
};

instacertify_crm.render_customer_lifecycle = function (data) {
	const totals = data.totals || {};
	const summary = `
		<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
			${[
				[__("Quotes"), totals.quotes || 0],
				[__("Accepted"), totals.accepted_quotes || 0],
				[__("Delivered to customer"), totals.deliveries_to_customer || 0],
				[__("Data from customer"), totals.data_from_customer || 0],
				[__("Reports"), totals.reports || 0],
				[__("Renewals"), totals.renewals || 0],
				[__("Remarks"), totals.remarks || 0],
			]
				.map(
					([label, value]) =>
						`<div style="min-width:110px"><div class="text-muted">${label}</div><div style="font-size:20px;font-weight:700">${value}</div></div>`,
				)
				.join("")}
		</div>`;

	const projects = (data.projects || [])
		.map(
			(p) =>
				`<li><a href="/app/ic-customer-project/${encodeURIComponent(p.name)}">${frappe.utils.escape_html(
					p.project_title || p.name,
				)}</a> <span class="indicator-pill orange">${frappe.utils.escape_html(p.status || "")}</span></li>`,
		)
		.join("");

	const deliveries = (data.deliveries || [])
		.slice(0, 12)
		.map((d) => {
			const file = d.attachment
				? ` · <a href="${frappe.utils.escape_html(d.attachment)}" target="_blank">${__("File")}</a>`
				: "";
			return `<tr>
				<td>${frappe.datetime.str_to_user(d.delivered_on) || ""}</td>
				<td>${frappe.utils.escape_html(d.delivery_type || "")}</td>
				<td>${frappe.utils.escape_html(d.direction || "")}</td>
				<td><a href="/app/ic-delivery-record/${encodeURIComponent(d.name)}">${frappe.utils.escape_html(
					d.title || d.name,
				)}</a>${file}</td>
			</tr>`;
		})
		.join("");

	const timeline = (data.timeline || [])
		.slice(0, 25)
		.map((t) => {
			const file = t.attachment
				? ` · <a href="${frappe.utils.escape_html(t.attachment)}" target="_blank">${__("File")}</a>`
				: "";
			const link = t.link
				? `<a href="${frappe.utils.escape_html(t.link)}">${frappe.utils.escape_html(t.title || "")}</a>`
				: frappe.utils.escape_html(t.title || "");
			return `<div style="border-left:3px solid var(--border-color);padding:6px 0 6px 12px;margin:6px 0">
				<div class="text-muted" style="font-size:12px">${frappe.datetime.str_to_user(t.when) || ""} · ${frappe.utils.escape_html(
					t.kind || "",
				)}</div>
				<div>${link}${file}</div>
				<div class="text-muted">${frappe.utils.escape_html(t.detail || "")}</div>
			</div>`;
		})
		.join("");

	return `<div>
		<div style="margin-bottom:6px"><strong>${frappe.utils.escape_html(
			data.customer_name || "",
		)}</strong> · ${frappe.utils.escape_html(data.company || "")}</div>
		${summary}
		${
			projects
				? `<div style="margin-bottom:12px"><strong>${__("Projects")}</strong><ul>${projects}</ul></div>`
				: ""
		}
		<div style="margin-bottom:12px">
			<strong>${__("Delivery & shared records")}</strong>
			<table class="table table-bordered" style="margin-top:6px">
				<thead><tr><th>${__("When")}</th><th>${__("Type")}</th><th>${__("Direction")}</th><th>${__(
					"Record",
				)}</th></tr></thead>
				<tbody>${
					deliveries ||
					`<tr><td colspan="4" class="text-muted">${__("No delivery records yet. Log deliveries, reports, or customer uploads.")}</td></tr>`
				}</tbody>
			</table>
		</div>
		<div><strong>${__("Lifecycle timeline")}</strong>${
			timeline || `<div class="text-muted">${__("No lifecycle events yet.")}</div>`
		}</div>
	</div>`;
};

instacertify_crm.show_customer_lifecycle = function (args) {
	frappe.call({
		method: "instacertify_crm.api.get_customer_lifecycle",
		args,
		freeze: true,
		callback(r) {
			const data = r.message || {};
			const d = new frappe.ui.Dialog({
				title: __("Customer lifecycle — {0}", [data.customer_name || data.company || __("Customer")]),
				size: "extra-large",
				fields: [{ fieldtype: "HTML", fieldname: "body" }],
				primary_action_label: data.project ? __("Open project") : __("Create project"),
				primary_action() {
					d.hide();
					if (data.project) {
						frappe.set_route("Form", "IC Customer Project", data.project);
						return;
					}
					frappe.call({
						method: "instacertify_crm.api.ensure_customer_project",
						args: { lead: args.lead, quote: args.quote },
						freeze: true,
						callback(res) {
							if (res.message?.name) {
								frappe.set_route("Form", "IC Customer Project", res.message.name);
							}
						},
					});
				},
			});
			d.fields_dict.body.$wrapper.html(instacertify_crm.render_customer_lifecycle(data));
			d.show();
		},
	});
};

instacertify_crm.mark_service_delivered_dialog = function (quote) {
	const d = new frappe.ui.Dialog({
		title: __("Mark quote service delivered"),
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "help",
				options: `<p class="text-muted">${__(
					"Logs delivery, updates the project, and optionally schedules certification renewal reminders.",
				)}</p>`,
			},
			{ fieldname: "remarks", label: __("Delivery remarks"), fieldtype: "Small Text" },
			{ fieldname: "attachment", label: __("Proof / deliverable file"), fieldtype: "Attach" },
			{
				fieldtype: "Section Break",
				label: __("Certification renewal reminders"),
				description: __(
					"Check when you want to be reminded to renew this certification. Uncheck any you do not need.",
				),
			},
			{
				fieldname: "remind_6_months",
				label: __("Remind in 6 months"),
				fieldtype: "Check",
				default: 0,
			},
			{
				fieldname: "remind_1_year",
				label: __("Remind in 1 year"),
				fieldtype: "Check",
				default: 1,
			},
			{
				fieldname: "custom_renewal_on",
				label: __("Custom reminder date"),
				fieldtype: "Date",
				description: __("Optional — e.g. a specific renewal due date."),
			},
		],
		primary_action_label: __("Mark delivered"),
		primary_action(values) {
			frappe.call({
				method: "instacertify_crm.api.mark_service_delivered",
				args: {
					quote: quote.name || quote,
					remarks: values.remarks,
					attachment: values.attachment,
					remind_6_months: values.remind_6_months ? 1 : 0,
					remind_1_year: values.remind_1_year ? 1 : 0,
					custom_renewal_on: values.custom_renewal_on || null,
				},
				freeze: true,
				callback(r) {
					d.hide();
					const renewals = (r.message && r.message.renewals) || [];
					frappe.show_alert({
						message: renewals.length
							? __("Service delivered — {0} renewal reminder(s) scheduled", [renewals.length])
							: __("Service delivery logged"),
						indicator: "green",
					});
					if (r.message?.delivery) {
						frappe.set_route("Form", "IC Delivery Record", r.message.delivery);
					}
				},
			});
		},
	});
	d.show();
};

instacertify_crm.show_lead_cost_spend = function () {
	if (!instacertify_crm.is_admin()) {
		frappe.msgprint(__("Only IC Admin can view lead cost spend"));
		return;
	}
	frappe.call({
		method: "instacertify_crm.api.get_lead_cost_spend",
		args: { group_by: "Lead Source" },
		freeze: true,
		callback(r) {
			const data = r.message || {};
			const summary = (data.summary || [])
				.map(
					(s) =>
						`<div style="min-width:140px"><div class="text-muted">${frappe.utils.escape_html(
							s.label || "",
						)}</div><div style="font-size:20px;font-weight:700">${
							s.datatype === "Currency" ? format_currency(s.value) : s.value ?? 0
						}</div></div>`,
				)
				.join("");
			const rows = (data.rows || [])
				.map(
					(row) => `<tr>
					<td>${frappe.utils.escape_html(row.group_label || "")}</td>
					<td class="text-right">${row.lead_count || 0}</td>
					<td class="text-right"><strong>${format_currency(row.total_cost)}</strong></td>
					<td class="text-right">${format_currency(row.avg_cost)}</td>
				</tr>`,
				)
				.join("");
			const html = `
				<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px">${summary}</div>
				<table class="table table-bordered">
					<thead><tr>
						<th>${__("Group")}</th>
						<th class="text-right">${__("Leads")}</th>
						<th class="text-right">${__("Total Cost")}</th>
						<th class="text-right">${__("Avg")}</th>
					</tr></thead>
					<tbody>${
						rows ||
						`<tr><td colspan="4" class="text-muted">${__("No leads found.")}</td></tr>`
					}</tbody>
				</table>`;
			const d = new frappe.ui.Dialog({
				title: __("Lead cost spend"),
				size: "large",
				fields: [{ fieldtype: "HTML", fieldname: "body" }],
				primary_action_label: __("Open full report"),
				primary_action() {
					d.hide();
					frappe.set_route("query-report", "IC Lead Cost Spend");
				},
			});
			d.fields_dict.body.$wrapper.html(html);
			d.show();
		},
	});
};

instacertify_crm.create_document_request_dialog = function (quote) {
	frappe.call({
		method: "instacertify_crm.api.get_service_documents",
		args: { service: quote.service },
		freeze: true,
		callback(r) {
			const docs = r.message || [];
			if (!docs.length) {
				frappe.msgprint(
					__("No documents in the service library. Add them on IC Service, or create IC Document Request manually."),
				);
				return;
			}
			const d = new frappe.ui.Dialog({
				title: __("Select documents to request from customer"),
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "help",
						options: `<p class="text-muted">${__(
							"Choose the checklist for this accepted quote. Only selected documents will be linked for customer upload.",
						)}</p>`,
					},
					{
						fieldname: "documents",
						fieldtype: "MultiCheck",
						label: __("Documents"),
						reqd: 1,
						options: docs.map((doc) => ({
							label: doc.document_name + (doc.required ? " *" : ""),
							value: doc.document_name,
							checked: !!doc.required,
						})),
					},
					{
						fieldname: "questionnaire",
						label: __("Questionnaire / remarks to customer"),
						fieldtype: "Small Text",
					},
				],
				primary_action_label: __("Create & copy link"),
				primary_action(values) {
					const selected = values.documents || [];
					if (!selected.length) {
						frappe.msgprint(__("Select at least one document"));
						return;
					}
					const payload = docs
						.filter((doc) => selected.includes(doc.document_name))
						.map((doc) => ({
							document_name: doc.document_name,
							description: doc.description,
							required: doc.required,
						}));
					frappe.call({
						method: "instacertify_crm.api.create_document_request",
						args: {
							quote: quote.name,
							documents: payload,
							questionnaire: values.questionnaire,
						},
						freeze: true,
						callback(res) {
							d.hide();
							if (res.message?.public_url) {
								instacertify_crm.copy_text(res.message.public_url);
								frappe.msgprint({
									title: __("Document request shared"),
									message: __(
										"Customer upload link copied.<br><a href='/app/ic-document-request/{0}'>Open {0}</a><br>{1}",
										[res.message.name, res.message.public_url],
									),
									indicator: "green",
								});
							}
						},
					});
				},
			});
			d.show();
		},
	});
};
