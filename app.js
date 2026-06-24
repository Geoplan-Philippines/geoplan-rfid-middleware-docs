/**
 * Renderer for the SSI RFID Middleware API docs.
 * Pure DOM rendering from window.API_DOCS — no framework, no build step.
 */
(function () {
  const { API_INFO, CONVENTIONS, GROUPS } = window.API_DOCS;

  const METHOD_COLORS = {
    GET: 'bg-emerald-600',
    POST: 'bg-sky-600',
    PATCH: 'bg-amber-600',
    DELETE: 'bg-rose-600',
  };

  // ---- small helpers -------------------------------------------------------

  const el = (tag, className, html) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const json = (value) => escapeHtml(JSON.stringify(value, null, 2));

  const statusBadge = (status) =>
    status === 'implemented'
      ? '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">● Implemented</span>'
      : '<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">◐ Planned</span>';

  const authBadge = (auth) =>
    auth
      ? '<span class="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">🔒 x-api-key</span>'
      : '<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">🌐 Public</span>';

  // ---- table builder for params -------------------------------------------

  const paramTable = (title, rows, columns) => {
    const wrap = el('div', 'mt-4');
    wrap.appendChild(el('h4', 'mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500', title));

    const table = el('table', 'w-full border-collapse text-sm');
    const thead = el('thead');
    const headRow = el('tr', 'border-b border-slate-200 text-left text-slate-500');
    columns.forEach((c) => headRow.appendChild(el('th', 'py-1.5 pr-4 font-medium', c.label)));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach((row) => {
      const tr = el('tr', 'border-b border-slate-100 align-top');
      columns.forEach((c) => {
        const td = el('td', 'py-1.5 pr-4');
        td.innerHTML = c.render(row);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  };

  const codeCell = (v) => (v == null || v === '' ? '<span class="text-slate-400">—</span>' : `<code class="text-slate-800">${escapeHtml(v)}</code>`);
  const reqCell = (b) =>
    b ? '<span class="font-medium text-rose-600">required</span>' : '<span class="text-slate-400">optional</span>';

  // ---- code block with copy -----------------------------------------------

  const codeBlock = (label, text) => {
    const wrap = el('div', 'mt-3');
    const bar = el('div', 'flex items-center justify-between rounded-t-md bg-slate-800 px-3 py-1.5');
    bar.appendChild(el('span', 'text-xs font-medium text-slate-300', label));
    const btn = el('button', 'text-xs text-slate-300 hover:text-white', 'Copy');
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy'), 1200);
      });
    });
    bar.appendChild(btn);
    wrap.appendChild(bar);
    const pre = el('pre', 'overflow-x-auto rounded-b-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100');
    pre.appendChild(el('code', '', escapeHtml(text)));
    wrap.appendChild(pre);
    return wrap;
  };

  // ---- endpoint card -------------------------------------------------------

  const endpointCard = (ep) => {
    const card = el('article', 'endpoint scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm');
    card.id = ep.id;
    card.dataset.status = ep.status;
    card.dataset.search = `${ep.method} ${ep.path} ${ep.title}`.toLowerCase();

    // header
    const header = el('div', 'flex flex-wrap items-center gap-3');
    header.appendChild(el('span', `rounded-md ${METHOD_COLORS[ep.method] || 'bg-slate-600'} px-2.5 py-1 text-xs font-bold text-white`, ep.method));
    header.appendChild(el('code', 'text-sm font-semibold text-slate-900', escapeHtml(ep.path)));
    const badges = el('div', 'ml-auto flex flex-wrap items-center gap-2');
    badges.innerHTML = `${statusBadge(ep.status)} ${authBadge(ep.auth)}`;
    header.appendChild(badges);
    card.appendChild(header);

    card.appendChild(el('h3', 'mt-3 text-base font-semibold text-slate-900', escapeHtml(ep.title)));
    card.appendChild(el('p', 'mt-1 text-sm leading-relaxed text-slate-600', escapeHtml(ep.description)));

    if (ep.source) {
      card.appendChild(el('p', 'mt-2 text-xs text-slate-400', `Source: <code>${escapeHtml(ep.source)}</code>`));
    }

    // path params
    if (ep.pathParams && ep.pathParams.length) {
      card.appendChild(
        paramTable('Path parameters', ep.pathParams, [
          { label: 'Name', render: (r) => codeCell(r.name) },
          { label: 'Type', render: (r) => codeCell(r.type) },
          { label: 'Description', render: (r) => escapeHtml(r.description) },
        ]),
      );
    }

    // query params
    if (ep.queryParams && ep.queryParams.length) {
      card.appendChild(
        paramTable('Query parameters', ep.queryParams, [
          { label: 'Name', render: (r) => codeCell(r.name) },
          { label: 'Type', render: (r) => codeCell(r.type) },
          { label: 'Required', render: (r) => reqCell(r.required) },
          { label: 'Default', render: (r) => codeCell(r.default) },
          { label: 'Description', render: (r) => escapeHtml(r.description) },
        ]),
      );
    }

    // request body
    if (ep.requestBody) {
      card.appendChild(el('h4', 'mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500', `Request body (${ep.requestBody.contentType})`));
      if (ep.requestBody.fields && ep.requestBody.fields.length) {
        card.appendChild(
          paramTable('', ep.requestBody.fields, [
            { label: 'Field', render: (r) => codeCell(r.name) },
            { label: 'Type', render: (r) => codeCell(r.type) },
            { label: 'Required', render: (r) => reqCell(r.required) },
            { label: 'Description', render: (r) => escapeHtml(r.description) },
          ]),
        );
      }
      if (ep.requestBody.sample) {
        card.appendChild(codeBlock('Sample request', JSON.stringify(ep.requestBody.sample, null, 2)));
      }
    }

    // responses
    if (ep.responses && ep.responses.length) {
      card.appendChild(el('h4', 'mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500', 'Responses'));
      ep.responses.forEach((res) => {
        const line = el('div', 'mt-2 flex items-center gap-2');
        const ok = res.status >= 200 && res.status < 300;
        line.appendChild(el('span', `rounded px-2 py-0.5 text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`, String(res.status)));
        line.appendChild(el('span', 'text-sm text-slate-600', escapeHtml(res.description)));
        card.appendChild(line);
        if (res.sample !== null && res.sample !== undefined) {
          card.appendChild(codeBlock(`Sample response (${res.status})`, JSON.stringify(res.sample, null, 2)));
        }
      });
    }

    // errors
    if (ep.errors && ep.errors.length) {
      card.appendChild(
        paramTable('Errors', ep.errors, [
          { label: 'Status', render: (r) => `<code class="font-bold text-rose-600">${r.status}</code>` },
          { label: 'Error', render: (r) => codeCell(r.code) },
          { label: 'When', render: (r) => escapeHtml(r.when) },
        ]),
      );
    }

    // notes
    if (ep.notes && ep.notes.length) {
      const notes = el('div', 'mt-4 rounded-md border-l-4 border-sky-300 bg-sky-50 p-3');
      notes.appendChild(el('h4', 'text-xs font-semibold uppercase tracking-wide text-sky-700', 'Notes'));
      const ul = el('ul', 'mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600');
      ep.notes.forEach((n) => ul.appendChild(el('li', '', escapeHtml(n))));
      notes.appendChild(ul);
      card.appendChild(notes);
    }

    return card;
  };

  // ---- group section -------------------------------------------------------

  const groupSection = (group) => {
    const section = el('section', 'group-section scroll-mt-24');
    section.id = `group-${group.id}`;

    const counts = group.endpoints.reduce(
      (acc, e) => ((acc[e.status] = (acc[e.status] || 0) + 1), acc),
      {},
    );
    const countLabel = [
      counts.implemented ? `${counts.implemented} implemented` : null,
      counts.planned ? `${counts.planned} planned` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const head = el('div', 'mb-4');
    const title = el('div', 'flex items-baseline gap-3');
    title.appendChild(el('h2', 'text-xl font-bold text-slate-900', escapeHtml(group.name)));
    title.appendChild(el('span', 'text-xs text-slate-400', countLabel));
    head.appendChild(title);
    head.appendChild(el('p', 'mt-1 text-sm text-slate-600', escapeHtml(group.blurb)));
    section.appendChild(head);

    const list = el('div', 'space-y-4');
    group.endpoints.forEach((ep) => list.appendChild(endpointCard(ep)));
    section.appendChild(list);

    return section;
  };

  // ---- sidebar -------------------------------------------------------------

  const buildSidebar = () => {
    const nav = document.getElementById('sidebar-nav');
    GROUPS.forEach((group) => {
      const link = el('a', 'block rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900');
      link.href = `#group-${group.id}`;
      const planned = group.endpoints.every((e) => e.status === 'planned');
      link.innerHTML = `${escapeHtml(group.name)} ${planned ? '<span class="text-amber-500">◐</span>' : ''}`;
      nav.appendChild(link);
    });
  };

  // ---- conventions ---------------------------------------------------------

  const buildConventions = () => {
    const grid = document.getElementById('conventions-grid');
    CONVENTIONS.forEach((c) => {
      const card = el('div', 'rounded-lg border border-slate-200 bg-white p-4');
      card.appendChild(el('h3', 'text-sm font-semibold text-slate-900', escapeHtml(c.title)));
      card.appendChild(el('p', 'mt-1 text-sm leading-relaxed text-slate-600', c.body));
      grid.appendChild(card);
    });
  };

  // ---- filtering -----------------------------------------------------------

  let activeFilter = 'all';
  let searchTerm = '';

  const applyFilters = () => {
    document.querySelectorAll('.endpoint').forEach((card) => {
      const matchStatus = activeFilter === 'all' || card.dataset.status === activeFilter;
      const matchSearch = !searchTerm || card.dataset.search.includes(searchTerm);
      card.style.display = matchStatus && matchSearch ? '' : 'none';
    });
    // hide group sections that have no visible endpoints
    document.querySelectorAll('.group-section').forEach((section) => {
      const anyVisible = Array.from(section.querySelectorAll('.endpoint')).some((c) => c.style.display !== 'none');
      section.style.display = anyVisible ? '' : 'none';
    });
  };

  const wireControls = () => {
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((b) =>
          b.classList.toggle('filter-active', b === btn),
        );
        applyFilters();
      });
    });
    const searchInputs = document.querySelectorAll('.js-search');
    searchInputs.forEach((search) => {
      search.addEventListener('input', () => {
        searchTerm = search.value.trim().toLowerCase();
        searchInputs.forEach((other) => {
          if (other !== search) other.value = search.value;
        });
        applyFilters();
      });
    });
  };

  // ---- counts banner -------------------------------------------------------

  const buildCounts = () => {
    let impl = 0;
    let planned = 0;
    GROUPS.forEach((g) => g.endpoints.forEach((e) => (e.status === 'implemented' ? impl++ : planned++)));
    document.getElementById('count-implemented').textContent = impl;
    document.getElementById('count-planned').textContent = planned;
    document.getElementById('count-total').textContent = impl + planned;
  };

  // ---- init ----------------------------------------------------------------

  const init = () => {
    document.getElementById('api-title').textContent = API_INFO.title;
    document.getElementById('api-subtitle').textContent = API_INFO.subtitle;
    document.getElementById('api-base-url').textContent = API_INFO.baseUrl;
    document.getElementById('api-golive').textContent = API_INFO.goLive;

    buildCounts();
    buildConventions();
    buildSidebar();

    const main = document.getElementById('groups');
    GROUPS.forEach((group) => main.appendChild(groupSection(group)));

    wireControls();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
