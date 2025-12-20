// client-side logic for listing, filtering, adding, editing, deleting, and summary
const API = "/api/expenses";

const form = document.getElementById("expense-form");
const expensesEl = document.getElementById("expenses");
const btnFilter = document.getElementById("btnFilter");
const btnClear = document.getElementById("btnClear");
const filterCustomer = document.getElementById("filterCustomer");
const filterCategory = document.getElementById("filterCategory");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");

const summaryCustomer = document.getElementById("summaryCustomer");
const summaryYear = document.getElementById("summaryYear");
const summaryMonth = document.getElementById("summaryMonth");
const btnSummary = document.getElementById("btnSummary");
const summaryResult = document.getElementById("summaryResult");

const modalRoot = document.getElementById("modalRoot");

// utility
const fmtDate = d => new Date(d).toLocaleDateString();

// load initial (all) expenses
async function loadExpenses(query = {}) {
  let url = API;
  const params = new URLSearchParams(query).toString();
  if (params) url += "?" + params;
  const res = await fetch(url);
  const data = await res.json();
  renderExpenses(data);
}

function renderExpenses(items) {
  expensesEl.innerHTML = "";
  if (!items.length) { expensesEl.innerHTML = "<div class='small'>No expenses yet.</div>"; return; }
  items.forEach(exp => {
    const div = document.createElement("div");
    div.className = "expense-item";
    div.innerHTML = `
      <div class="expense-main">
        <strong>${exp.category} — ₹${exp.amount.toFixed(2)}</strong>
        <div class="expense-meta">${fmtDate(exp.date)} • ${exp.customerId} • ${exp.note || ""}</div>
      </div>
      <div class="actions">
        <button class="edit" onclick='openEdit("${exp._id}")'>Edit</button>
        <button class="del" onclick='delExpense("${exp._id}")'>Delete</button>
      </div>
    `;
    expensesEl.appendChild(div);
  });
}

// add expense
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    customerId: document.getElementById("customerId").value.trim(),
    category: document.getElementById("category").value,
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    note: document.getElementById("note").value.trim()
  };
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  form.reset();
  loadExpenses();
});

// delete
async function delExpense(id) {
  if (!confirm("Delete this expense?")) return;
  await fetch(`${API}/${id}`, { method: "DELETE" });
  loadExpenses();
}

// open edit modal
async function openEdit(id) {
  const res = await fetch(`${API}/${id}`);
  const exp = await res.json();

  // build modal
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal card">
        <h1>Edit Expense</h1>
        <div class="form-row"><input id="e_customerId" value="${escapeHtml(exp.customerId)}" /></div>
        <div class="form-row">
          <select id="e_category">
            <option${exp.category==="Food"?" selected":""}>Food</option>
            <option${exp.category==="Transport"?" selected":""}>Transport</option>
            <option${exp.category==="Shopping"?" selected":""}>Shopping</option>
            <option${exp.category==="Utilities"?" selected":""}>Utilities</option>
            <option${exp.category==="Other"?" selected":""}>Other</option>
          </select>
        </div>
        <div class="form-row"><input id="e_amount" type="number" value="${exp.amount}" /></div>
        <div class="form-row"><input id="e_date" type="date" value="${(new Date(exp.date)).toISOString().slice(0,10)}" /></div>
        <div class="form-row"><textarea id="e_note">${escapeHtml(exp.note || "")}</textarea></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="saveBtn" class="primary">Save</button>
          <button id="cancelBtn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("cancelBtn").onclick = () => { modalRoot.innerHTML = ""; };
  document.getElementById("modalBackdrop").onclick = (ev) => {
    if (ev.target.id === "modalBackdrop") modalRoot.innerHTML = "";
  };

  document.getElementById("saveBtn").onclick = async () => {
    const payload = {
      customerId: document.getElementById("e_customerId").value.trim(),
      category: document.getElementById("e_category").value,
      amount: Number(document.getElementById("e_amount").value),
      date: document.getElementById("e_date").value,
      note: document.getElementById("e_note").value.trim()
    };
    await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    modalRoot.innerHTML = "";
    loadExpenses();
  };
}

// basic escape helper for safety in innerHTML building
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":"&#39;"}[s]));
}

// filtering
btnFilter.addEventListener("click", () => {
  const q = {};
  if (filterCustomer.value.trim()) q.customerId = filterCustomer.value.trim();
  if (filterCategory.value) q.category = filterCategory.value;
  if (startDate.value) q.startDate = startDate.value;
  if (endDate.value) q.endDate = endDate.value;
  loadExpenses(q);
});
btnClear.addEventListener("click", () => {
  filterCustomer.value = ""; filterCategory.value = ""; startDate.value = ""; endDate.value = "";
  loadExpenses();
});

// summary
btnSummary.addEventListener("click", async () => {
  const cust = summaryCustomer.value.trim();
  const y = Number(summaryYear.value);
  const m = Number(summaryMonth.value);
  if (!cust || !y || !m || m < 1 || m > 12) {
    alert("Please enter valid customerId, year, and month (1-12)");
    return;
  }
  const res = await fetch(`/api/expenses/summary/${encodeURIComponent(cust)}/${y}/${m}`);
  const data = await res.json();
  renderSummary(data);
});

function renderSummary(data) {
  if (!data || !data.byCategory) {
    summaryResult.innerHTML = "<div class='small'>No data</div>";
    return;
  }
  let html = `<div class="row"><strong>Total for ${data.month}/${data.year}</strong><div><strong>₹${data.total.toFixed(2)}</strong></div></div>`;
  data.byCategory.forEach(cat => {
    html += `<div class="row"><div class="small">${cat._id} (${cat.count} items)</div><div>₹${cat.totalAmount.toFixed(2)}</div></div>`;
  });
  summaryResult.innerHTML = html;
}

// initial load
loadExpenses();
