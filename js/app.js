/**
 * Renderer for the Geoplan RFID Middleware API Docs docs.
 * Pure DOM rendering from window.API_DOCS. No framework, no build step, no motion.
 */
(function () {
  const { API_INFO, CONVENTIONS, GROUPS } = window.API_DOCS;

  // HTTP method -> tinted pill. Colour is carried by the method label only.
  const METHOD_PILL = {
    GET: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    POST: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    PATCH: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    DELETE: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  };
  const FALLBACK_PILL = 'bg-zinc-100 text-zinc-700 ring-zinc-400/20';

  // Shared label for in-card section headings (sentence case, not an eyebrow).
  const SECTION_LABEL = 'mt-5 text-[13px] font-semibold text-zinc-500';

  // ---- helpers -------------------------------------------------------------

  const el = (tag, className, html) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const statusBadge = (status) =>
    status === 'implemented'
      ? '<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Implemented</span>'
      : '<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>Planned</span>';

  const authBadge = (auth) =>
    auth
      ? '<span class="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-300">🔒 x-api-key</span>'
      : '<span class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">🌐 Public</span>';

  // ---- param table ---------------------------------------------------------

  const paramTable = (title, rows, columns) => {
    const wrap = el('div', 'mt-4');
    if (title) {
      wrap.appendChild(el('h4', 'mb-2 text-[13px] font-semibold text-zinc-500', title));
    }
    const table = el('table', 'w-full border-collapse text-sm');
    const headRow = el('tr');
    columns.forEach((c) =>
      headRow.appendChild(el('th', 'border-b border-zinc-200 py-1.5 pr-4 text-left text-[11px] font-semibold text-zinc-400', c.label)),
    );
    const thead = el('thead');
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach((row) => {
      const tr = el('tr', 'border-b border-zinc-100 align-top last:border-0');
      columns.forEach((c) => {
        const td = el('td', 'py-2 pr-4 text-zinc-700');
        td.innerHTML = c.render(row);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  };

  const codeCell = (v) => (v == null || v === '' ? '<span class="text-zinc-300">·</span>' : `<code class="inline">${escapeHtml(v)}</code>`);
  const reqCell = (b) =>
    b ? '<span class="font-medium text-rose-600">required</span>' : '<span class="text-zinc-400">optional</span>';

  // ---- dark code block with copy ------------------------------------------

  const codeBlock = (label, text) => {
    const wrap = el('div', 'mt-3 overflow-hidden rounded-lg ring-1 ring-zinc-800');
    const bar = el('div', 'flex items-center justify-between bg-zinc-900 px-3.5 py-2');
    bar.appendChild(el('span', 'font-mono text-[11px] text-zinc-400', label));
    const btn = el('button', 'font-mono text-[11px] text-zinc-400 hover:text-white', 'Copy');
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = 'Copy'), 1200);
      });
    });
    bar.appendChild(btn);
    wrap.appendChild(bar);
    const pre = el('pre', 'overflow-x-auto bg-zinc-950 p-3.5 font-mono text-[12.5px] leading-relaxed text-zinc-100');
    pre.appendChild(el('code', '', escapeHtml(text)));
    wrap.appendChild(pre);
    return wrap;
  };

  // ---- endpoint card -------------------------------------------------------

  const endpointCard = (ep) => {
    const pill = METHOD_PILL[ep.method] || FALLBACK_PILL;

    const card = el('article', 'endpoint scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm');
    card.id = ep.id;
    card.dataset.status = ep.status;
    card.dataset.search = `${ep.method} ${ep.path} ${ep.title}`.toLowerCase();

    // header row
    const header = el('div', 'flex flex-wrap items-center gap-x-3 gap-y-2');
    header.appendChild(el('span', `rounded-md px-2 py-1 font-mono text-[11px] font-bold ring-1 ring-inset ${pill}`, ep.method));
    header.appendChild(el('code', 'font-mono text-sm font-semibold text-zinc-900', escapeHtml(ep.path)));
    const badges = el('div', 'ml-auto flex flex-wrap items-center gap-2');
    badges.innerHTML = `${statusBadge(ep.status)} ${authBadge(ep.auth)}`;
    header.appendChild(badges);
    card.appendChild(header);

    card.appendChild(el('h3', 'mt-3.5 text-[15px] font-bold tracking-tight text-zinc-900', escapeHtml(ep.title)));
    card.appendChild(el('p', 'mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600', escapeHtml(ep.description)));

    if (ep.source) {
      card.appendChild(el('p', 'rich mt-2.5 text-xs text-zinc-400', `Source <code>${escapeHtml(ep.source)}</code>`));
    }

    if (ep.pathParams && ep.pathParams.length) {
      card.appendChild(
        paramTable('Path parameters', ep.pathParams, [
          { label: 'Name', render: (r) => codeCell(r.name) },
          { label: 'Type', render: (r) => codeCell(r.type) },
          { label: 'Description', render: (r) => escapeHtml(r.description) },
        ]),
      );
    }

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

    if (ep.requestBody) {
      const fields = ep.requestBody.fields || [];
      card.appendChild(el('h4', SECTION_LABEL, `Request body · ${escapeHtml(ep.requestBody.contentType)}`));
      if (fields.length) {
        card.appendChild(
          paramTable('', fields, [
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

    if (ep.responses && ep.responses.length) {
      card.appendChild(el('h4', SECTION_LABEL, 'Responses'));
      ep.responses.forEach((res) => {
        const ok = res.status >= 200 && res.status < 300;
        const line = el('div', 'mt-2.5 flex items-center gap-2.5');
        line.appendChild(
          el('span', `rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${ok ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'}`, String(res.status)),
        );
        line.appendChild(el('span', 'text-sm text-zinc-600', escapeHtml(res.description)));
        card.appendChild(line);
        if (res.sample !== null && res.sample !== undefined) {
          card.appendChild(codeBlock(`Response · ${res.status}`, JSON.stringify(res.sample, null, 2)));
        }
      });
    }

    if (ep.errors && ep.errors.length) {
      card.appendChild(
        paramTable('Errors', ep.errors, [
          { label: 'Status', render: (r) => `<code class="inline font-bold text-rose-600">${r.status}</code>` },
          { label: 'Error', render: (r) => codeCell(r.code) },
          { label: 'When', render: (r) => escapeHtml(r.when) },
        ]),
      );
    }

    if (ep.notes && ep.notes.length) {
      const notes = el('div', 'mt-5 border-t border-zinc-100 pt-4');
      notes.appendChild(el('h4', 'text-[13px] font-semibold text-zinc-500', 'Notes'));
      const ul = el('ul', 'mt-1.5 list-disc space-y-1 pl-5 text-sm text-zinc-600');
      ep.notes.forEach((n) => ul.appendChild(el('li', '', escapeHtml(n))));
      notes.appendChild(ul);
      card.appendChild(notes);
    }

    return card;
  };

  // ---- group section -------------------------------------------------------

  const countChip = (n, kind) => {
    if (!n) return '';
    const cls =
      kind === 'implemented'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
        : 'bg-amber-50 text-amber-700 ring-amber-600/20';
    return `<span class="rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}">${n} ${kind}</span>`;
  };

  const groupSection = (group) => {
    const section = el('section', 'group-section scroll-mt-24');
    section.id = `group-${group.id}`;

    const counts = group.endpoints.reduce((acc, e) => ((acc[e.status] = (acc[e.status] || 0) + 1), acc), {});

    const head = el('div', 'mb-5 border-b border-zinc-200 pb-4');
    const title = el('div', 'flex flex-wrap items-center gap-3');
    title.appendChild(el('h2', 'text-2xl font-bold tracking-tight text-zinc-900', escapeHtml(group.name)));
    const chips = el('div', 'flex items-center gap-1.5');
    chips.innerHTML = `${countChip(counts.implemented, 'implemented')}${countChip(counts.planned, 'planned')}`;
    title.appendChild(chips);
    head.appendChild(title);
    head.appendChild(el('p', 'mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500', escapeHtml(group.blurb)));
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
      const allPlanned = group.endpoints.every((e) => e.status === 'planned');
      const link = el('a', 'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900');
      link.href = `#group-${group.id}`;
      link.setAttribute('data-nav', '');
      link.innerHTML = `<span class="truncate">${escapeHtml(group.name)}</span>${
        allPlanned ? '<span class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></span>' : ''
      }`;
      nav.appendChild(link);
    });
  };

  // ---- conventions ---------------------------------------------------------

  const buildConventions = () => {
    const list = document.getElementById('conventions-grid');
    CONVENTIONS.forEach((c, i) => {
      const row = el('div', `px-5 py-4 sm:grid sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-8 ${i ? 'border-t border-zinc-100' : ''}`);
      row.appendChild(el('h3', 'text-sm font-semibold text-zinc-900', escapeHtml(c.title)));
      row.appendChild(el('p', 'rich mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-600 sm:mt-0', c.body));
      list.appendChild(row);
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
    document.querySelectorAll('.group-section').forEach((section) => {
      const anyVisible = Array.from(section.querySelectorAll('.endpoint')).some((c) => c.style.display !== 'none');
      section.style.display = anyVisible ? '' : 'none';
    });
  };

  const setFilterActive = (activeBtn) => {
    document.querySelectorAll('.filter-btn').forEach((b) => {
      const on = b === activeBtn;
      b.classList.toggle('bg-zinc-900', on);
      b.classList.toggle('text-white', on);
      b.classList.toggle('bg-white', !on);
      b.classList.toggle('text-zinc-700', !on);
      b.classList.toggle('hover:bg-zinc-50', !on);
    });
  };

  const wireControls = () => {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        setFilterActive(btn);
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

    const copyBase = document.getElementById('copy-base');
    if (copyBase) {
      copyBase.addEventListener('click', () => {
        navigator.clipboard.writeText(API_INFO.baseUrl).then(() => {
          copyBase.textContent = 'Copied';
          setTimeout(() => (copyBase.textContent = 'Copy'), 1200);
        });
      });
    }
  };

  // ---- scroll-spy (instant highlight, no motion) ---------------------------

  const setupScrollSpy = () => {
    const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
    const idOf = (a) => a.getAttribute('href').slice(1);
    const setActive = (id) =>
      navLinks.forEach((a) => {
        const on = idOf(a) === id;
        a.classList.toggle('bg-zinc-100', on);
        a.classList.toggle('text-zinc-900', on);
      });

    const targets = navLinks.map((a) => document.getElementById(idOf(a))).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
  };

  // ---- counts --------------------------------------------------------------

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

    buildCounts();
    buildConventions();
    buildSidebar();

    const main = document.getElementById('groups');
    GROUPS.forEach((group) => main.appendChild(groupSection(group)));

    wireControls();
    setupScrollSpy();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
