import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, deleteField, onSnapshot, query, orderBy, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuqprV4uVabimh-ZO99CIAK08vFdM4wo8",
    authDomain: "login-me-71357.firebaseapp.com",
    projectId: "login-me-71357",
    storageBucket: "login-me-71357.firebasestorage.app",
    messagingSenderId: "276063778916",
    appId: "1:276063778916:web:92858cbe5bdddb6890c771",
    measurementId: "G-7MRK44J170"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
let currentUser = null;
window.getCurrentUser = () => currentUser;
window.isUserLoggedIn = () => Boolean(currentUser);

window.openAuthModal = function(message = '') {
    const authModal = document.getElementById('authModal');
    if (!authModal) return;
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');

    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = 'block';
    }
    if (registerScreen) {
        registerScreen.classList.add('hidden');
        registerScreen.style.display = 'none';
    }

    const alertDiv = document.getElementById('login-alert');
    if (alertDiv) {
        if (message) {
            alertDiv.innerHTML = `<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2 mb-3 shadow-sm"><i class="fa-solid fa-lock text-amber-600 text-sm shrink-0"></i><span></span></div>`;
            alertDiv.querySelector('span').textContent = message;
        } else {
            alertDiv.innerHTML = '';
        }
    }
};

window.closeAuthModal = function() {
    const authModal = document.getElementById('authModal');
    if (!authModal) return;
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');
    const alertDiv = document.getElementById('login-alert');
    if (alertDiv) alertDiv.innerHTML = '';
    window.AppRouter?.onModalClosed('authModal');
};

const authModalEl = document.getElementById('authModal');
if (authModalEl) {
    authModalEl.addEventListener('click', (e) => {
        if (e.target === authModalEl) {
            window.closeAuthModal();
        }
    });
}

let unsubscribeCustomers = null;
let unsubscribeTransactions = null;
let unsubscribePanApplications = null;
let customers = [];
let transactions = [];
let panApplications = [];
let activePanApplicationId = null;
let panApplicationStep = 1;
let panApplicationFiles = {};
let panExistingDocuments = {};
let userProfile = null;
let reportPeriod = 'today';

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Could not enable persistent sign-in.', error);
});

const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const welcomeScreen = document.getElementById('welcome-screen');

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

showRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginScreen) { loginScreen.classList.add('hidden'); loginScreen.style.display = 'none'; }
    if (registerScreen) { registerScreen.classList.remove('hidden'); registerScreen.style.display = 'block'; }
    const loginAlert = document.getElementById('login-alert');
    if (loginAlert) loginAlert.innerHTML = '';
});

showLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (registerScreen) { registerScreen.classList.add('hidden'); registerScreen.style.display = 'none'; }
    if (loginScreen) { loginScreen.classList.remove('hidden'); loginScreen.style.display = 'block'; }
    const registerAlert = document.getElementById('register-alert');
    if (registerAlert) registerAlert.innerHTML = '';
});

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

const loginAlert = document.getElementById('login-alert');
const registerAlert = document.getElementById('register-alert');

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
});

function formatCurrency(value, signedType = '') {
    const amount = Number(value) || 0;
    const prefix = signedType === 'Income' ? '+' : signedType === 'Expense' ? '-' : '';
    return `${prefix}${currencyFormatter.format(amount)}`;
}

function dateFromFirestore(value) {
    if (value && typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return null;
}

function formatDateTime(value) {
    const date = dateFromFirestore(value);
    if (!date || Number.isNaN(date.getTime())) return 'Saving…';
    return date.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

function isToday(value) {
    const date = dateFromFirestore(value);
    if (!date || Number.isNaN(date.getTime())) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
}

function customerStatusClass(status) {
    if (status === 'Pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'Completed') return 'bg-teal-100 text-teal-800 border-teal-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

function clearTable(tableBody, colspan, message) {
    tableBody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colspan;
    cell.className = 'p-6 text-center text-xs text-gray-500';
    cell.textContent = message;
    row.appendChild(cell);
    tableBody.appendChild(row);
}

function createIconButton(iconClass, colorClass, label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `p-1.5 ${colorClass} hover:bg-gray-100 rounded`;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<i class="${iconClass}"></i>`;
    button.addEventListener('click', onClick);
    return button;
}

let customerStatusFilter = 'all';

function setCustomerStatusFilter(status) {
    customerStatusFilter = status || 'all';
    document.querySelectorAll('[data-customer-filter-chip]').forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset.customerFilterChip === customerStatusFilter);
    });
    renderCustomers();
}
window.setCustomerStatusFilter = setCustomerStatusFilter;
window.filterCustomerTable = () => renderCustomers();

function showCustomerEmptyState(title, message, actionLabel, action) {
    const empty = document.getElementById('customers-empty-state');
    const list = document.getElementById('customers-list');
    if (list) list.replaceChildren();
    if (!empty) return;
    empty.classList.remove('hidden');
    empty.replaceChildren();
    const icon = document.createElement('div');
    icon.className = 'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600';
    icon.innerHTML = '<i class="fa-solid fa-users"></i>';
    const heading = document.createElement('h4');
    heading.className = 'text-base font-bold text-slate-800';
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.className = 'mx-auto mt-1 max-w-md text-sm text-slate-500';
    copy.textContent = message;
    empty.append(icon, heading, copy);
    if (actionLabel && action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700';
        button.textContent = actionLabel;
        button.addEventListener('click', action);
        empty.appendChild(button);
    }
}

function updateCustomerSummary(list) {
    const counts = {
        all: list.length,
        Pending: list.filter((customer) => customer.status === 'Pending').length,
        Paid: list.filter((customer) => customer.status === 'Paid').length,
        Completed: list.filter((customer) => customer.status === 'Completed').length
    };
    const map = {
        'customer-stat-total': counts.all,
        'customer-stat-pending': counts.Pending,
        'customer-stat-paid': counts.Paid,
        'customer-stat-completed': counts.Completed
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function renderCustomers() {
    const tableBody = document.getElementById('customers-table-body');
    const list = document.getElementById('customers-list');
    const empty = document.getElementById('customers-empty-state');
    if (tableBody) tableBody.replaceChildren();
    if (!currentUser) {
        updateCustomerSummary([]);
        showCustomerEmptyState(
            'Customer records are locked',
            'Log in to open /customers and manage CSC jobs, payments, and receipts.',
            'Log in to view records',
            () => window.openAuthModal?.('Please log in to view customer records.')
        );
        updateDashboardStats();
        return;
    }
    updateCustomerSummary(customers);
    if (!customers.length) {
        showCustomerEmptyState(
            'No customers yet',
            'Add the first job from this workspace. It saves to your private Firestore records.',
            'Add first customer',
            () => window.AppRouter?.go('/customers/new') || window.openNewCustomerModal?.()
        );
        updateDashboardStats();
        return;
    }

    const query = (document.getElementById('customer-search-input')?.value || '').toLowerCase().trim();
    const filtered = customers.filter((customer) => {
        const haystack = `${customer.name || ''} ${customer.phone || ''} ${customer.service || ''} ${customer.status || ''}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesStatus = customerStatusFilter === 'all' || customer.status === customerStatusFilter;
        return matchesQuery && matchesStatus;
    });

    if (!filtered.length) {
        showCustomerEmptyState('No matching customers', 'Try another name, mobile number, or status filter.', 'Clear filters', () => {
            const search = document.getElementById('customer-search-input');
            if (search) search.value = '';
            setCustomerStatusFilter('all');
        });
        updateDashboardStats();
        return;
    }

    if (empty) {
        empty.classList.add('hidden');
        empty.replaceChildren();
    }
    if (!list) {
        updateDashboardStats();
        return;
    }
    list.replaceChildren();
    filtered.forEach((customer) => {
        const card = document.createElement('article');
        card.className = 'customer-card';
        const initials = (customer.name || 'CS').split(/\s+/).filter(Boolean).map((word) => word[0]).join('').toUpperCase().slice(0, 2) || 'CS';
        const phone = customer.phone || '';
        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700"></div>
                    <div class="min-w-0">
                        <h4 class="truncate text-base font-black text-slate-900"></h4>
                        <p class="truncate text-xs text-slate-500"></p>
                    </div>
                </div>
                <span class="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${customerStatusClass(customer.status)}"></span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-xl bg-slate-50 p-2.5">
                    <div class="font-bold uppercase tracking-wide text-[10px] text-slate-400">Amount</div>
                    <div class="mt-0.5 font-black text-slate-900">${formatCurrency(customer.amount)}</div>
                </div>
                <div class="rounded-xl bg-slate-50 p-2.5">
                    <div class="font-bold uppercase tracking-wide text-[10px] text-slate-400">When</div>
                    <div class="mt-0.5 font-semibold text-slate-700">${formatDateTime(customer.createdAt)}</div>
                </div>
            </div>
            <div class="flex flex-wrap gap-1.5"></div>
        `;
        card.querySelector('.rounded-2xl.bg-indigo-100').textContent = initials;
        card.querySelector('h4').textContent = customer.name || 'Unnamed customer';
        card.querySelector('p').textContent = customer.service || 'Service not set';
        card.querySelector('span').textContent = customer.status || 'Paid';
        const actions = card.querySelector('.flex.flex-wrap');
        if (phone) {
            const call = document.createElement('a');
            call.href = `tel:${phone}`;
            call.className = 'inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200';
            call.textContent = phone;
            actions.appendChild(call);
        }
        const makeBtn = (label, icon, className, onClick, disabled = false) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${className}`;
            button.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
            button.disabled = disabled;
            if (!disabled) button.addEventListener('click', onClick);
            actions.appendChild(button);
        };
        makeBtn(
            customer.transactionId ? 'Recorded' : 'Confirm pay',
            customer.transactionId ? 'fa-circle-check' : 'fa-indian-rupee-sign',
            customer.transactionId ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700',
            (event) => window.confirmCustomerTransaction(customer, event.currentTarget),
            Boolean(customer.transactionId)
        );
        makeBtn('Bill', 'fa-receipt', 'bg-amber-50 text-amber-800 hover:bg-amber-100', () => window.viewCustomerRecord(customer));
        makeBtn('Edit', 'fa-pen', 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50', () => window.startCustomerEdit(customer));
        makeBtn('Delete', 'fa-trash', 'bg-rose-50 text-rose-700 hover:bg-rose-100', () => window.deleteCustomerRecord(customer));
        list.appendChild(card);
    });
    updateDashboardStats();
}

function renderTransactions() {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;
    if (!currentUser) {
        clearTable(tableBody, 8, '🔒 Please log in to view transaction history.');
        updateDashboardStats();
        return;
    }
    if (!transactions.length) {
        clearTable(tableBody, 8, 'No transactions yet. Add income or an expense to save it in Firestore.');
        updateDashboardStats();
        return;
    }

    tableBody.replaceChildren();
    transactions.forEach((transaction) => {
        const isIncome = transaction.type === 'Income';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition';
        const details = [
            [`#${transaction.reference || transaction.id.slice(0, 8).toUpperCase()}`, 'p-3 font-mono font-bold text-gray-500'],
            [transaction.name || '—', 'p-3 font-bold text-gray-900'],
            [transaction.category || '—', 'p-3 text-gray-600']
        ];
        details.forEach(([value, className]) => {
            const cell = document.createElement('td');
            cell.className = className;
            cell.textContent = value;
            row.appendChild(cell);
        });
        const typeCell = document.createElement('td');
        typeCell.className = 'p-3';
        const typeBadge = document.createElement('span');
        typeBadge.className = `px-2 py-0.5 rounded text-[10px] font-bold ${isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
        typeBadge.textContent = (transaction.type || 'Expense').toUpperCase();
        typeCell.appendChild(typeBadge);
        const amountCell = document.createElement('td');
        amountCell.className = `p-3 font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`;
        amountCell.textContent = formatCurrency(transaction.amount, transaction.type);
        const methodCell = document.createElement('td');
        methodCell.className = 'p-3 text-gray-600';
        methodCell.textContent = transaction.method || '—';
        const dateCell = document.createElement('td');
        dateCell.className = 'p-3 text-gray-500';
        dateCell.textContent = formatDateTime(transaction.createdAt);
        const statusCell = document.createElement('td');
        statusCell.className = 'p-3 text-center';
        const success = document.createElement('span');
        success.className = 'text-xs font-bold text-emerald-600';
        success.innerHTML = '<i class="fa-solid fa-circle-check"></i> Success';
        statusCell.appendChild(success);
        row.append(typeCell, amountCell, methodCell, dateCell, statusCell);
        tableBody.appendChild(row);
    });
    updateDashboardStats();
}

function updateDashboardStats() {
    if (!currentUser) {
        const guestStats = {
            'stat-customers-count': '—',
            'stat-income-amount': '₹0',
            'stat-expense-amount': '₹0',
            'stat-profit-amount': '₹0',
            'stat-pending-count': '—',
            'stat-completed-count': '—',
            'stat-lifetime-earnings': '₹0'
        };
        Object.entries(guestStats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        return;
    }

    const customerCount = customers.filter((customer) => isToday(customer.createdAt)).length;
    const todaysTransactions = transactions.filter((transaction) => isToday(transaction.createdAt));
    const income = todaysTransactions.filter((transaction) => transaction.type === 'Income').reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const expense = todaysTransactions.filter((transaction) => transaction.type === 'Expense').reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const lifetimeEarnings = transactions
        .filter((transaction) => transaction.type === 'Income')
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const pending = customers.filter((customer) => customer.status === 'Pending').length;
    const completed = customers.filter((customer) => customer.status === 'Completed' || customer.status === 'Paid').length;
    const stats = {
        'stat-customers-count': customerCount,
        'stat-income-amount': formatCurrency(income),
        'stat-expense-amount': formatCurrency(expense),
        'stat-profit-amount': formatCurrency(income - expense),
        'stat-pending-count': pending,
        'stat-completed-count': completed,
        'stat-lifetime-earnings': formatCurrency(lifetimeEarnings)
    };
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    updateBusinessReport();
}

function setReportText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderReportPaymentBreakdown(incomeTransactions) {
    const container = document.getElementById('report-payment-breakdown');
    if (!container) return;
    const totals = new Map();
    incomeTransactions.forEach((transaction) => {
        const method = transaction.method || 'Other';
        totals.set(method, (totals.get(method) || 0) + (Number(transaction.amount) || 0));
    });

    container.replaceChildren();
    if (!totals.size) {
        const empty = document.createElement('p');
        empty.className = 'col-span-full py-2 text-center text-gray-400';
        empty.textContent = 'No income transactions recorded today.';
        container.appendChild(empty);
        return;
    }

    [...totals.entries()].sort(([, amountA], [, amountB]) => amountB - amountA).forEach(([method, amount]) => {
        const card = document.createElement('div');
        card.className = 'bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2';
        const label = document.createElement('div');
        label.className = 'truncate text-[10px] font-semibold text-gray-500';
        label.textContent = method;
        const value = document.createElement('div');
        value.className = 'mt-0.5 text-xs font-bold text-slate-800';
        value.textContent = formatCurrency(amount);
        card.append(label, value);
        container.appendChild(card);
    });
}

function renderReportServiceBreakdown(incomeTransactions, totalIncome) {
    const container = document.getElementById('report-service-breakdown');
    if (!container) return;
    const totals = new Map();
    incomeTransactions.forEach((transaction) => {
        const service = transaction.category || 'Other service';
        totals.set(service, (totals.get(service) || 0) + (Number(transaction.amount) || 0));
    });

    container.replaceChildren();
    if (!totals.size) {
        const empty = document.createElement('p');
        empty.className = 'py-3 text-center text-gray-400';
        empty.textContent = 'Add an income transaction to see service-wise performance here.';
        container.appendChild(empty);
        return;
    }

    const barColours = ['bg-purple-600', 'bg-blue-600', 'bg-teal-600', 'bg-amber-500', 'bg-rose-500'];
    [...totals.entries()].sort(([, amountA], [, amountB]) => amountB - amountA).slice(0, 5).forEach(([service, amount], index) => {
        const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
        const row = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-3 font-semibold text-gray-700 mb-1';
        const name = document.createElement('span');
        name.className = 'truncate';
        name.textContent = service;
        const amountLabel = document.createElement('span');
        amountLabel.className = 'shrink-0 text-[10px]';
        amountLabel.textContent = `${percentage}% (${formatCurrency(amount)})`;
        header.append(name, amountLabel);
        const track = document.createElement('div');
        track.className = 'w-full bg-gray-200 h-2 rounded-full overflow-hidden';
        const bar = document.createElement('div');
        bar.className = `${barColours[index]} h-full rounded-full transition-all duration-300`;
        bar.style.width = `${percentage}%`;
        track.appendChild(bar);
        row.append(header, track);
        container.appendChild(row);
    });
}

function setBusinessReportPeriod(period) {
    reportPeriod = period === 'lifetime' ? 'lifetime' : 'today';
    updateBusinessReport();
}

function updateBusinessReport() {
    const isLifetimeReport = reportPeriod === 'lifetime';
    const reportTransactions = isLifetimeReport
        ? transactions
        : transactions.filter((transaction) => isToday(transaction.createdAt));
    const reportCustomers = isLifetimeReport
        ? customers
        : customers.filter((customer) => isToday(customer.createdAt));
    const incomeTransactions = reportTransactions.filter((transaction) => transaction.type === 'Income');
    const expenseTransactions = reportTransactions.filter((transaction) => transaction.type === 'Expense');
    const income = incomeTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const expense = expenseTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const pending = customers.filter((customer) => customer.status === 'Pending').length;
    const completed = reportCustomers.filter((customer) => customer.status === 'Completed' || customer.status === 'Paid').length;
    const reportLabel = isLifetimeReport ? 'Lifetime' : 'Today';

    setReportText('report-income-amount', formatCurrency(income));
    setReportText('report-expense-amount', formatCurrency(expense));
    setReportText('report-profit-amount', formatCurrency(income - expense));
    setReportText('report-transaction-count', String(reportTransactions.length));
    setReportText('report-pending-count', String(pending));
    setReportText('report-completed-count', String(completed));
    setReportText('report-customer-count', String(reportCustomers.length));
    setReportText('report-period-description', isLifetimeReport
        ? 'Lifetime data from all saved income, expenses and customer records.'
        : 'Today’s live data from your saved income, expenses and customer records.');
    setReportText('report-payment-period', reportLabel);
    setReportText('report-customer-period', isLifetimeReport ? 'customer orders overall' : 'customer orders today');
    setReportText('report-income-caption', incomeTransactions.length
        ? `${incomeTransactions.length} income record${incomeTransactions.length === 1 ? '' : 's'} ${isLifetimeReport ? 'overall' : 'today'}`
        : `Income recorded ${isLifetimeReport ? 'overall' : 'today'}`);
    setReportText('report-last-updated', `Updated ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`);
    document.querySelectorAll('[data-report-period]').forEach((button) => {
        const isActive = button.dataset.reportPeriod === reportPeriod;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
    renderReportPaymentBreakdown(incomeTransactions);
    renderReportServiceBreakdown(incomeTransactions, income);
}

function stopDashboardSubscriptions() {
    unsubscribeCustomers?.();
    unsubscribeTransactions?.();
    unsubscribePanApplications?.();
    unsubscribeCustomers = null;
    unsubscribeTransactions = null;
    unsubscribePanApplications = null;
}

function showDashboardDataError(message) {
    console.error(message);
    const customerBody = document.getElementById('customers-table-body');
    const transactionBody = document.getElementById('transactions-table-body');
    if (customerBody) clearTable(customerBody, 7, message);
    const empty = document.getElementById('customers-empty-state');
    if (empty) {
        empty.classList.remove('hidden');
        empty.textContent = message;
    }
    if (transactionBody) clearTable(transactionBody, 8, message);
}

function startDashboardSubscriptions(user) {
    stopDashboardSubscriptions();
    customers = [];
    transactions = [];
    panApplications = [];
    renderCustomers();
    renderTransactions();
    renderPanApplicationList();

    const customerQuery = query(collection(db, 'users', user.uid, 'customers'), orderBy('createdAt', 'desc'));
    const transactionQuery = query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'));
    const panApplicationQuery = query(collection(db, 'users', user.uid, 'panApplications'), orderBy('createdAt', 'desc'));
    unsubscribeCustomers = onSnapshot(customerQuery, (snapshot) => {
        customers = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
        renderCustomers();
    }, (error) => showDashboardDataError(`Unable to load customer data: ${error.message}`));
    unsubscribeTransactions = onSnapshot(transactionQuery, (snapshot) => {
        transactions = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
        renderTransactions();
    }, (error) => showDashboardDataError(`Unable to load transaction data: ${error.message}`));
    unsubscribePanApplications = onSnapshot(panApplicationQuery, (snapshot) => {
        panApplications = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
        renderPanApplicationList();
    }, (error) => {
        console.error('Unable to load PAN application data:', error);
        renderPanApplicationList(`Unable to load PAN applications: ${error.message}`);
    });
}

function signedInUser() {
    if (!currentUser) throw new Error('Please log in before saving dashboard data.');
    return currentUser;
}

function renderProfilePhoto(photoURL = '') {
    const fallback = 'https://placehold.co/96x96/5c43cd/ffffff?text=Profile';
    ['profile-photo-preview', 'image1'].forEach((id) => {
        const image = document.getElementById(id);
        if (image) image.src = photoURL || fallback;
    });
}

function renderCenterName(centerName = '') {
    const heading = document.getElementById('center-name-heading');
    if (heading) {
        heading.textContent = String(centerName).trim() || 'Akshay Santra Common Services Centre';
    }
}

function populateProfileForm() {
    if (!userProfile) return;
    const fields = {
        'profile-name': userProfile.name || '',
        'profile-mobile': userProfile.number || '',
        'profile-email': userProfile.email || '',
        'profile-address': userProfile.address || '',
        'profile-center-name': userProfile.centerName || ''
    };
    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });
    renderProfilePhoto(userProfile.photoURL);
    renderCenterName(userProfile.centerName);
    const emailHelp = document.getElementById('profile-email-help');
    if (emailHelp) {
        const pendingEmail = userProfile.pendingEmail;
        if (pendingEmail && pendingEmail !== userProfile.email) {
            emailHelp.textContent = `Verification is pending for ${pendingEmail}. Open the link sent to that address to finish the email change.`;
            emailHelp.classList.remove('hidden');
        } else {
            emailHelp.textContent = '';
            emailHelp.classList.add('hidden');
        }
    }
}

async function updateUserProfile(profileUpdate) {
    const user = signedInUser();
    const nextEmail = profileUpdate.email.trim().toLowerCase();
    const address = profileUpdate.address.trim();
    const centerName = (profileUpdate.centerName || '').trim();
    const currentEmail = (user.email || '').toLowerCase();
    const isEmailChanged = nextEmail !== currentEmail;

    if (!nextEmail) throw new Error('Enter a valid email address.');
    if (profileUpdate.photoFile) {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedImageTypes.includes(profileUpdate.photoFile.type)) {
            throw new Error('Choose a JPG, PNG, or WEBP profile photo.');
        }
        if (profileUpdate.photoFile.size > 5 * 1024 * 1024) {
            throw new Error('Profile photo must be 5 MB or smaller.');
        }
    }
    if (isEmailChanged) {
        if (!profileUpdate.currentPassword) {
            throw new Error('Enter your current password to change your email address.');
        }
        const credential = EmailAuthProvider.credential(user.email, profileUpdate.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await verifyBeforeUpdateEmail(user, nextEmail);
    }

    let photoURL = userProfile?.photoURL || '';
    let photoUploaded = false;
    if (profileUpdate.photoFile) {
        const profilePhotoRef = ref(storage, `users/${user.uid}/profile/avatar`);
        await uploadBytes(profilePhotoRef, profileUpdate.photoFile, { contentType: profileUpdate.photoFile.type });
        photoURL = await getDownloadURL(profilePhotoRef);
        photoUploaded = true;
    }

    const profileDocumentUpdate = {
        address,
        centerName,
        updatedAt: serverTimestamp()
    };
    if (isEmailChanged) profileDocumentUpdate.pendingEmail = nextEmail;
    if (photoUploaded) profileDocumentUpdate.photoURL = photoURL;
    await setDoc(doc(db, 'users', user.uid), profileDocumentUpdate, { merge: true });

    userProfile = {
        ...(userProfile || {}),
        email: user.email || currentEmail,
        address,
        centerName,
        pendingEmail: isEmailChanged ? nextEmail : userProfile?.pendingEmail,
        photoURL
    };
    populateProfileForm();
    const emailDisplay = document.getElementById('disp-email');
    if (emailDisplay) emailDisplay.textContent = userProfile.email;
    return { profile: userProfile, emailVerificationSent: isEmailChanged, photoUploaded };
}

async function saveCustomer(customer, customerId = null) {
    const user = signedInUser();
    const payload = {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        service: customer.service.trim(),
        amount: Number(customer.amount),
        status: customer.status,
        paymentMethod: customer.paymentMethod,
        updatedAt: serverTimestamp()
    };
    if (!payload.name || !/^\d{10}$/.test(payload.phone) || !payload.service || !Number.isFinite(payload.amount) || payload.amount < 0 || !['Paid', 'Pending', 'Completed'].includes(payload.status) || !['UPI', 'Cash', 'Card', 'Bank'].includes(payload.paymentMethod)) {
        throw new Error('Enter a valid customer name, mobile number, service, and amount.');
    }
    const customerCollection = collection(db, 'users', user.uid, 'customers');
    if (customerId) {
        await updateDoc(doc(customerCollection, customerId), payload);
    } else {
        await addDoc(customerCollection, { ...payload, createdAt: serverTimestamp() });
    }
}

async function deleteCustomer(customerId) {
    const user = signedInUser();
    await deleteDoc(doc(db, 'users', user.uid, 'customers', customerId));
}

async function recordCustomerTransaction(customerId) {
    const user = signedInUser();
    const customerRef = doc(db, 'users', user.uid, 'customers', customerId);
    const transactionRef = doc(collection(db, 'users', user.uid, 'transactions'));
    const reference = `TXN-${transactionRef.id.slice(-8).toUpperCase()}`;

    await runTransaction(db, async (firestoreTransaction) => {
        const customerSnapshot = await firestoreTransaction.get(customerRef);
        if (!customerSnapshot.exists()) throw new Error('This customer record no longer exists.');

        const customer = customerSnapshot.data();
        if (customer.transactionId) throw new Error('A transaction has already been recorded for this customer.');
        const amount = Number(customer.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('A customer transaction must have an amount greater than zero.');

        firestoreTransaction.set(transactionRef, {
            reference,
            customerId,
            name: customer.name || 'Customer payment',
            category: customer.service || 'Customer service',
            amount,
            method: customer.paymentMethod || 'UPI',
            type: 'Income',
            status: 'Success',
            source: 'customer-confirmation',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        firestoreTransaction.update(customerRef, {
            transactionId: transactionRef.id,
            transactionReference: reference,
            paymentConfirmedAt: serverTimestamp(),
            status: customer.status === 'Pending' ? 'Paid' : (customer.status || 'Paid'),
            updatedAt: serverTimestamp()
        });
    });
}

async function saveTransaction(transaction) {
    const user = signedInUser();
    const amount = Number(transaction.amount);
    if (!transaction.name.trim() || !transaction.category.trim() || !['Income', 'Expense'].includes(transaction.type) || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter valid transaction details and an amount greater than zero.');
    }
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        reference: `TXN-${Date.now().toString().slice(-8)}`,
        name: transaction.name.trim(),
        category: transaction.category.trim(),
        amount,
        method: transaction.method,
        type: transaction.type,
        status: 'Success',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

function panElement(id) {
    return document.getElementById(id);
}

function panValue(id) {
    return (panElement(id)?.value || '').trim();
}

function panApplicationTypeLabel(type) {
    return ({ new: 'New PAN card', correction: 'Change / correction', reprint: 'Reprint PAN card' })[type] || 'PAN application';
}

function panProviderLabel(provider) {
    return provider === 'protean' ? 'Protean PAN Services' : 'UTIITSL PAN Services';
}

function setPanApplicationAlert(message = '', type = 'error') {
    const alert = panElement('pan-application-alert');
    if (!alert) return;
    if (!message) {
        alert.className = 'mb-4 hidden rounded-xl px-3 py-2.5 text-xs';
        alert.textContent = '';
        return;
    }
    const styles = {
        error: 'border border-rose-200 bg-rose-50 text-rose-800',
        success: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
        info: 'border border-blue-200 bg-blue-50 text-blue-800'
    };
    alert.className = `mb-4 rounded-xl px-3 py-2.5 text-xs ${styles[type] || styles.error}`;
    alert.textContent = message;
}

function panApplicationStatusClass(status) {
    if (status === 'Acknowledgement Received') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'Official Portal Opened') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status === 'Ready for Official Submission') return 'bg-violet-100 text-violet-800 border-violet-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
}

function updatePanExistingNumberVisibility() {
    const needsExistingPan = panValue('pan-application-type') !== 'new';
    panElement('pan-existing-number-group')?.classList.toggle('hidden', !needsExistingPan);
    const existingPan = panElement('pan-existing-number');
    if (existingPan) {
        existingPan.required = needsExistingPan;
        if (!needsExistingPan) existingPan.value = '';
    }
}

function updatePanApplicationNavigation() {
    document.querySelectorAll('[data-pan-step]').forEach((section) => {
        section.classList.toggle('hidden', Number(section.dataset.panStep) !== panApplicationStep);
    });
    document.querySelectorAll('[data-pan-step-target]').forEach((indicator) => {
        const step = Number(indicator.dataset.panStepTarget);
        const isCurrent = step === panApplicationStep;
        const isComplete = step < panApplicationStep;
        indicator.className = `pan-step-indicator rounded-xl border px-2 py-2 text-left transition ${isCurrent
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : isComplete
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-white text-gray-500'}`;
        indicator.setAttribute('aria-current', isCurrent ? 'step' : 'false');
    });
    panElement('pan-previous-step')?.classList.toggle('hidden', panApplicationStep === 1);
    panElement('pan-next-step')?.classList.toggle('hidden', panApplicationStep === 4);
    panElement('pan-open-official')?.classList.toggle('hidden', panApplicationStep !== 4);
    if (panApplicationStep === 4) renderPanApplicationReview();
}

function showPanApplicationStep(step, options = {}) {
    const nextStep = Math.min(4, Math.max(1, Number(step) || 1));
    if (!options.skipValidation && nextStep > panApplicationStep) {
        if (nextStep !== panApplicationStep + 1) {
            setPanApplicationAlert('Complete each step in order so the application can be checked properly.', 'info');
            return false;
        }
        if (!validatePanApplicationStep(panApplicationStep)) return false;
    }
    panApplicationStep = nextStep;
    setPanApplicationAlert('');
    updatePanApplicationNavigation();
    return true;
}

function validatePanApplicationStep(step, showBrowserMessage = true) {
    updatePanExistingNumberVisibility();
    const fieldIdsByStep = {
        1: ['pan-application-type', 'pan-application-provider', 'pan-contact-mobile', 'pan-contact-email'],
        2: ['pan-title', 'pan-first-name', 'pan-last-name', 'pan-dob', 'pan-gender', 'pan-father-name', 'pan-name-on-card'],
        3: ['pan-address-line1', 'pan-city', 'pan-state', 'pan-pincode'],
        4: []
    };
    const fieldIds = [...(fieldIdsByStep[step] || [])];
    if (step === 1 && panValue('pan-application-type') !== 'new') fieldIds.push('pan-existing-number');
    for (const id of fieldIds) {
        const field = panElement(id);
        if (!field?.checkValidity()) {
            if (showBrowserMessage) field?.reportValidity();
            setPanApplicationAlert('Please complete the highlighted required field.', 'error');
            return false;
        }
    }
    if (step === 1 && !/^\d{10}$/.test(panValue('pan-contact-mobile'))) {
        setPanApplicationAlert('Enter a valid 10-digit customer mobile number.', 'error');
        panElement('pan-contact-mobile')?.focus();
        return false;
    }
    if (step === 1 && panValue('pan-application-type') !== 'new' && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(panValue('pan-existing-number'))) {
        setPanApplicationAlert('Enter a valid existing PAN in the format ABCDE1234F.', 'error');
        panElement('pan-existing-number')?.focus();
        return false;
    }
    if (step === 3 && panValue('pan-aadhaar-last4') && !/^\d{4}$/.test(panValue('pan-aadhaar-last4'))) {
        setPanApplicationAlert('Aadhaar last 4 digits must contain exactly four numbers.', 'error');
        panElement('pan-aadhaar-last4')?.focus();
        return false;
    }
    if (step === 4 && (!panElement('pan-single-pan-consent')?.checked || !panElement('pan-data-consent')?.checked)) {
        setPanApplicationAlert('Confirm both declarations before continuing to the official PAN portal.', 'error');
        return false;
    }
    return true;
}

function validatePanApplicationForSubmission() {
    for (let step = 1; step <= 4; step += 1) {
        if (!validatePanApplicationStep(step, false)) {
            panApplicationStep = step;
            updatePanApplicationNavigation();
            return false;
        }
    }
    return validatePanApplicationFiles();
}

function validatePanApplicationFiles() {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of Object.values(panApplicationFiles)) {
        if (!allowedTypes.includes(file.type)) {
            setPanApplicationAlert('Upload only JPG, PNG, WEBP, or PDF application files.', 'error');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPanApplicationAlert(`${file.name} is larger than 5 MB. Choose a smaller file.`, 'error');
            return false;
        }
    }
    return true;
}

function panApplicationData() {
    const applicationType = panValue('pan-application-type') || 'new';
    const firstName = panValue('pan-first-name').toUpperCase();
    const middleName = panValue('pan-middle-name').toUpperCase();
    const lastName = panValue('pan-last-name').toUpperCase();
    return {
        applicationType,
        provider: panValue('pan-application-provider') || 'uti',
        existingPan: panValue('pan-existing-number').toUpperCase(),
        contact: {
            mobile: panValue('pan-contact-mobile'),
            email: panValue('pan-contact-email').toLowerCase()
        },
        applicant: {
            title: panValue('pan-title'),
            firstName,
            middleName,
            lastName,
            fullName: [firstName, middleName, lastName].filter(Boolean).join(' '),
            dateOfBirth: panValue('pan-dob'),
            gender: panValue('pan-gender'),
            fatherName: panValue('pan-father-name').toUpperCase(),
            nameOnCard: panValue('pan-name-on-card').toUpperCase()
        },
        address: {
            line1: panValue('pan-address-line1'),
            line2: panValue('pan-address-line2'),
            city: panValue('pan-city'),
            state: panValue('pan-state'),
            pincode: panValue('pan-pincode'),
            aadhaarLast4: panValue('pan-aadhaar-last4')
        },
        acknowledgementNumber: panValue('pan-official-acknowledgement').toUpperCase(),
        consents: {
            singlePanConfirmed: Boolean(panElement('pan-single-pan-consent')?.checked),
            dataHandlingConfirmed: Boolean(panElement('pan-data-consent')?.checked)
        }
    };
}

function panSafeFileName(fileName) {
    return String(fileName || 'document').replace(/[^A-Za-z0-9._-]/g, '_').slice(-100);
}

async function uploadPanApplicationFiles(user, applicationId) {
    const documents = { ...panExistingDocuments };
    for (const [documentType, file] of Object.entries(panApplicationFiles)) {
        const filePath = `users/${user.uid}/pan-applications/${applicationId}/${documentType}-${Date.now()}-${panSafeFileName(file.name)}`;
        const fileReference = ref(storage, filePath);
        await uploadBytes(fileReference, file, { contentType: file.type });
        const url = await getDownloadURL(fileReference);
        documents[documentType] = {
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            storagePath: filePath,
            url,
            uploadedAt: new Date().toISOString()
        };
    }
    return documents;
}

function setPanFileLabel(documentType, text, hasFile = false) {
    const label = document.querySelector(`[data-pan-file-name="${documentType}"]`);
    if (!label) return;
    label.textContent = text;
    label.className = `mt-1 block truncate text-[10px] ${hasFile ? 'font-semibold text-emerald-700' : 'text-gray-400'}`;
}

function refreshPanFileLabels() {
    ['photo', 'signature', 'supportingProof'].forEach((documentType) => {
        const selected = panApplicationFiles[documentType];
        const saved = panExistingDocuments[documentType];
        if (selected) {
            setPanFileLabel(documentType, `${selected.name} · ${(selected.size / 1024).toFixed(0)} KB`, true);
        } else if (saved?.fileName) {
            setPanFileLabel(documentType, `Saved: ${saved.fileName}`, true);
        } else {
            setPanFileLabel(documentType, 'No file selected');
        }
    });
}

function handlePanApplicationFileSelection(event) {
    const input = event.currentTarget;
    const documentType = input.dataset.panDocument;
    const file = input.files?.[0];
    if (!documentType) return;
    if (!file) {
        delete panApplicationFiles[documentType];
        refreshPanFileLabels();
        return;
    }
    const allowedTypes = documentType === 'supportingProof'
        ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        : ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
        input.value = '';
        setPanApplicationAlert('Choose a JPG, PNG, WEBP, or PDF (for supporting proof) smaller than 5 MB.', 'error');
        return;
    }
    panApplicationFiles[documentType] = file;
    setPanApplicationAlert('');
    refreshPanFileLabels();
}

function addPanReviewField(container, label, value) {
    const row = document.createElement('div');
    row.className = 'flex flex-col gap-0.5 border-b border-gray-200 py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5';
    const fieldLabel = document.createElement('span');
    fieldLabel.className = 'font-semibold text-gray-500';
    fieldLabel.textContent = label;
    const fieldValue = document.createElement('span');
    fieldValue.className = 'break-words text-right font-semibold text-gray-900';
    fieldValue.textContent = value || '—';
    row.append(fieldLabel, fieldValue);
    container.appendChild(row);
}

function renderPanApplicationReview() {
    const container = panElement('pan-application-review');
    if (!container) return;
    const data = panApplicationData();
    container.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'mb-2 flex flex-wrap items-center justify-between gap-2';
    const title = document.createElement('span');
    title.className = 'font-bold text-gray-900';
    title.textContent = panApplicationTypeLabel(data.applicationType);
    const provider = document.createElement('span');
    provider.className = 'rounded-full bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100';
    provider.textContent = panProviderLabel(data.provider);
    heading.append(title, provider);
    container.appendChild(heading);
    addPanReviewField(container, 'Applicant', [data.applicant.title, data.applicant.fullName].filter(Boolean).join(' ') || 'Complete applicant details');
    addPanReviewField(container, 'Date of birth / gender', [data.applicant.dateOfBirth, data.applicant.gender].filter(Boolean).join(' · '));
    addPanReviewField(container, 'Contact', [data.contact.mobile, data.contact.email].filter(Boolean).join(' · '));
    addPanReviewField(container, 'Address', [data.address.line1, data.address.line2, data.address.city, data.address.state, data.address.pincode].filter(Boolean).join(', '));
    if (data.existingPan) addPanReviewField(container, 'Existing PAN', data.existingPan);
    const fileCount = Object.keys(panExistingDocuments).length + Object.keys(panApplicationFiles).filter((key) => !panExistingDocuments[key]).length;
    addPanReviewField(container, 'Application files', fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'} attached` : 'No files attached');
}

function resetPanApplicationForm() {
    panElement('pan-application-form')?.reset();
    activePanApplicationId = null;
    panApplicationFiles = {};
    panExistingDocuments = {};
    panApplicationStep = 1;
    updatePanExistingNumberVisibility();
    refreshPanFileLabels();
    setPanApplicationAlert('');
    updatePanApplicationNavigation();
}

function closePanApplicationModal() {
    setPanApplicationAlert('');
    closeModal('panApplicationModal');
}

function openPanApplicationModal() {
    if (!currentUser) {
        window.openAuthModal?.('Please log in to prepare and save a PAN application.');
        return;
    }
    resetPanApplicationForm();
    openModal('panApplicationModal');
}

function fillPanApplicationForm(application) {
    const setValue = (id, value = '') => {
        const element = panElement(id);
        if (element) element.value = value || '';
    };
    setValue('pan-application-type', application.applicationType || 'new');
    setValue('pan-application-provider', application.provider || 'uti');
    setValue('pan-existing-number', application.existingPan || '');
    setValue('pan-contact-mobile', application.contact?.mobile || '');
    setValue('pan-contact-email', application.contact?.email || '');
    setValue('pan-title', application.applicant?.title || 'Shri');
    setValue('pan-first-name', application.applicant?.firstName || '');
    setValue('pan-middle-name', application.applicant?.middleName || '');
    setValue('pan-last-name', application.applicant?.lastName || '');
    setValue('pan-dob', application.applicant?.dateOfBirth || '');
    setValue('pan-gender', application.applicant?.gender || '');
    setValue('pan-father-name', application.applicant?.fatherName || '');
    setValue('pan-name-on-card', application.applicant?.nameOnCard || '');
    setValue('pan-address-line1', application.address?.line1 || '');
    setValue('pan-address-line2', application.address?.line2 || '');
    setValue('pan-city', application.address?.city || '');
    setValue('pan-state', application.address?.state || '');
    setValue('pan-pincode', application.address?.pincode || '');
    setValue('pan-aadhaar-last4', application.address?.aadhaarLast4 || '');
    setValue('pan-official-acknowledgement', application.acknowledgementNumber || '');
    if (panElement('pan-single-pan-consent')) panElement('pan-single-pan-consent').checked = Boolean(application.consents?.singlePanConfirmed);
    if (panElement('pan-data-consent')) panElement('pan-data-consent').checked = Boolean(application.consents?.dataHandlingConfirmed);
}

function resumePanApplication(applicationId) {
    if (!currentUser) {
        window.openAuthModal?.('Please log in to view this application.');
        return;
    }
    const application = panApplications.find((item) => item.id === applicationId);
    if (!application) {
        setPanApplicationAlert('That PAN application is no longer available. Refresh and try again.', 'error');
        return;
    }
    resetPanApplicationForm();
    activePanApplicationId = application.id;
    panExistingDocuments = application.documents || {};
    fillPanApplicationForm(application);
    updatePanExistingNumberVisibility();
    refreshPanFileLabels();
    panApplicationStep = application.acknowledgementNumber ? 4 : 1;
    updatePanApplicationNavigation();
    openModal('panApplicationModal');
}

function renderPanApplicationList(errorMessage = '') {
    const container = panElement('pan-application-list');
    const count = panElement('pan-application-count');
    if (!container || !count) return;
    count.textContent = `${panApplications.length} application${panApplications.length === 1 ? '' : 's'}`;
    container.replaceChildren();
    if (errorMessage) {
        const error = document.createElement('p');
        error.className = 'rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700';
        error.textContent = errorMessage;
        container.appendChild(error);
        return;
    }
    if (!panApplications.length) {
        const empty = document.createElement('p');
        empty.className = 'rounded-lg bg-gray-50 px-3 py-3 text-center text-xs text-gray-500';
        empty.textContent = 'No PAN applications saved yet. Start a new application above.';
        container.appendChild(empty);
        return;
    }
    panApplications.slice(0, 8).forEach((application) => {
        const card = document.createElement('div');
        card.className = 'flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between';
        const details = document.createElement('div');
        details.className = 'min-w-0';
        const name = document.createElement('div');
        name.className = 'truncate text-xs font-bold text-gray-900';
        name.textContent = application.applicant?.fullName || application.contact?.mobile || 'PAN application';
        const metadata = document.createElement('div');
        metadata.className = 'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500';
        const reference = document.createElement('span');
        reference.className = 'font-mono';
        reference.textContent = application.reference || `PAN-${application.id.slice(-6).toUpperCase()}`;
        const service = document.createElement('span');
        service.textContent = panApplicationTypeLabel(application.applicationType);
        const created = document.createElement('span');
        created.textContent = formatDateTime(application.updatedAt || application.createdAt);
        metadata.append(reference, service, created);
        if (application.acknowledgementNumber) {
            const acknowledgement = document.createElement('span');
            acknowledgement.className = 'font-semibold text-emerald-700';
            acknowledgement.textContent = `Ack: ${application.acknowledgementNumber}`;
            metadata.appendChild(acknowledgement);
        }
        details.append(name, metadata);
        const controls = document.createElement('div');
        controls.className = 'flex shrink-0 items-center gap-2';
        const status = document.createElement('span');
        status.className = `rounded-full border px-2 py-1 text-[10px] font-bold ${panApplicationStatusClass(application.status)}`;
        status.textContent = application.status || 'Draft';
        const resume = document.createElement('button');
        resume.type = 'button';
        resume.className = 'rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50';
        resume.textContent = 'Open';
        resume.addEventListener('click', () => resumePanApplication(application.id));
        controls.append(status, resume);
        card.append(details, controls);
        container.appendChild(card);
    });
}

function panOfficialPortalUrl(application) {
    if (application.provider === 'protean') return 'https://tinpan.proteantech.in/';
    if (application.applicationType === 'correction') return 'https://www.pan.utiitsl.com/panonline_website/redirectCsf/formLanding';
    if (application.applicationType === 'reprint') return 'https://www.pan.utiitsl.com/PAN_ONLINE/reprintHome';
    return 'https://www.pan.utiitsl.com/panonline_website/redirect/formLanding';
}

function panApplicationReference(applicationId) {
    return `PAN-${applicationId.slice(-8).toUpperCase()}`;
}

function resetPanFileInputs() {
    document.querySelectorAll('[data-pan-document]').forEach((input) => {
        input.value = '';
    });
}

async function persistPanApplication(options = {}) {
    const { status = 'Draft', requireComplete = false } = options;
    const user = signedInUser();
    if (requireComplete && !validatePanApplicationForSubmission()) return null;
    if (!validatePanApplicationFiles()) return null;

    const data = panApplicationData();
    if (data.acknowledgementNumber && !/^[A-Z0-9/-]{3,60}$/i.test(data.acknowledgementNumber)) {
        setPanApplicationAlert('Use only letters, numbers, hyphens, or slashes in the official acknowledgement number.', 'error');
        panElement('pan-official-acknowledgement')?.focus();
        return null;
    }

    const existingApplication = panApplications.find((application) => application.id === activePanApplicationId);
    const applicationReference = activePanApplicationId
        ? doc(db, 'users', user.uid, 'panApplications', activePanApplicationId)
        : doc(collection(db, 'users', user.uid, 'panApplications'));
    const isNewApplication = !activePanApplicationId;
    const applicationId = applicationReference.id;
    const documents = await uploadPanApplicationFiles(user, applicationId);
    const nextStatus = data.acknowledgementNumber ? 'Acknowledgement Received' : status;
    const payload = {
        reference: existingApplication?.reference || panApplicationReference(applicationId),
        applicationType: data.applicationType,
        provider: data.provider,
        existingPan: data.existingPan,
        contact: data.contact,
        applicant: data.applicant,
        address: data.address,
        acknowledgementNumber: data.acknowledgementNumber,
        consents: data.consents,
        documents,
        status: nextStatus,
        updatedAt: serverTimestamp()
    };
    if (data.consents.singlePanConfirmed && data.consents.dataHandlingConfirmed) {
        payload.consentConfirmedAt = serverTimestamp();
    }
    if (nextStatus === 'Official Portal Opened') payload.officialPortalOpenedAt = serverTimestamp();
    if (isNewApplication) payload.createdAt = serverTimestamp();
    await setDoc(applicationReference, payload, { merge: true });

    activePanApplicationId = applicationId;
    panExistingDocuments = documents;
    panApplicationFiles = {};
    resetPanFileInputs();
    refreshPanFileLabels();
    return { id: applicationId, ...payload };
}

function setPanActionLoading(button, isLoading, label) {
    if (!button) return;
    if (isLoading) {
        button.dataset.originalLabel = button.innerHTML;
        button.disabled = true;
        button.classList.add('cursor-wait', 'opacity-70');
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>${label}`;
        return;
    }
    button.disabled = false;
    button.classList.remove('cursor-wait', 'opacity-70');
    button.innerHTML = button.dataset.originalLabel || button.innerHTML;
}

async function savePanApplicationDraft() {
    const button = panElement('pan-save-draft');
    setPanActionLoading(button, true, 'Saving…');
    try {
        const savedApplication = await persistPanApplication({ status: 'Draft' });
        if (savedApplication) {
            setPanApplicationAlert(`Draft ${savedApplication.reference} saved securely. You can resume it from the saved applications list.`, 'success');
        }
    } catch (error) {
        console.error('PAN application draft could not be saved:', error);
        setPanApplicationAlert(error.message || 'The PAN application draft could not be saved. Please try again.', 'error');
    } finally {
        setPanActionLoading(button, false);
    }
}

async function openOfficialPanPortal() {
    if (!validatePanApplicationForSubmission()) return;
    const application = panApplicationData();
    const officialUrl = panOfficialPortalUrl(application);
    const portalWindow = window.open('about:blank', '_blank');
    if (portalWindow) portalWindow.opener = null;
    const button = panElement('pan-open-official');
    setPanActionLoading(button, true, 'Saving…');
    try {
        const savedApplication = await persistPanApplication({ status: 'Official Portal Opened', requireComplete: true });
        if (!savedApplication) {
            portalWindow?.close();
            return;
        }
        setPanApplicationAlert(`Application ${savedApplication.reference} is saved. The official ${panProviderLabel(application.provider)} site is opening in a new tab.`, 'success');
        if (portalWindow) {
            portalWindow.location.replace(officialUrl);
        } else {
            window.open(officialUrl, '_blank', 'noopener,noreferrer');
        }
    } catch (error) {
        portalWindow?.close();
        console.error('Official PAN portal could not be opened:', error);
        setPanApplicationAlert(error.message || 'The application could not be saved before opening the official portal. Please try again.', 'error');
    } finally {
        setPanActionLoading(button, false);
    }
}

function syncPanNameOnCard() {
    const cardName = panElement('pan-name-on-card');
    if (!cardName || cardName.value.trim()) return;
    const name = [panValue('pan-first-name'), panValue('pan-middle-name'), panValue('pan-last-name')].filter(Boolean).join(' ').toUpperCase();
    if (name) cardName.value = name;
}

function initialisePanApplicationWorkspace() {
    panElement('pan-application-close')?.addEventListener('click', closePanApplicationModal);
    panElement('pan-application-type')?.addEventListener('change', updatePanExistingNumberVisibility);
    panElement('pan-application-provider')?.addEventListener('change', () => renderPanApplicationReview());
    panElement('pan-next-step')?.addEventListener('click', () => showPanApplicationStep(panApplicationStep + 1));
    panElement('pan-previous-step')?.addEventListener('click', () => showPanApplicationStep(panApplicationStep - 1, { skipValidation: true }));
    panElement('pan-save-draft')?.addEventListener('click', savePanApplicationDraft);
    panElement('pan-open-official')?.addEventListener('click', openOfficialPanPortal);
    panElement('pan-application-form')?.addEventListener('submit', (event) => event.preventDefault());
    document.querySelectorAll('[data-pan-step-target]').forEach((button) => {
        button.addEventListener('click', () => showPanApplicationStep(Number(button.dataset.panStepTarget)));
    });
    document.querySelectorAll('[data-pan-document]').forEach((input) => {
        input.addEventListener('change', handlePanApplicationFileSelection);
    });
    ['pan-first-name', 'pan-middle-name', 'pan-last-name'].forEach((id) => {
        panElement(id)?.addEventListener('input', syncPanNameOnCard);
    });
    ['pan-first-name', 'pan-middle-name', 'pan-last-name', 'pan-father-name', 'pan-name-on-card'].forEach((id) => {
        panElement(id)?.addEventListener('blur', (event) => {
            event.currentTarget.value = event.currentTarget.value.trim().toUpperCase();
        });
    });
    panElement('pan-existing-number')?.addEventListener('input', (event) => {
        event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    updatePanExistingNumberVisibility();
    refreshPanFileLabels();
    updatePanApplicationNavigation();
}

initialisePanApplicationWorkspace();

// Module-scoped functions are not available to inline service-card handlers by default.
// Expose only the PAN entry point used by the service catalogue.
window.openPanApplicationModal = openPanApplicationModal;

window.dashboardStore = { saveCustomer, deleteCustomer, recordCustomerTransaction, saveTransaction, updateUserProfile, populateProfileForm, refreshBusinessReport: updateBusinessReport, setReportPeriod: setBusinessReportPeriod };

// Display current live date
const todayOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const formattedDate = new Date().toLocaleDateString('en-IN', todayOptions);
if (document.getElementById('current-date-display')) {
    document.getElementById('current-date-display').innerText = formattedDate;
}

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginScreen.classList.add('hidden');
    registerScreen.classList.remove('hidden');
    loginAlert.innerHTML = '';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    registerAlert.innerHTML = '';
});

async function loadUserData(user) {
    let fullName = "Akshay Santra";
    let mobileNumber = "Not Provided";
    let email = user.email;
    let address = '';
    let pendingEmail = '';
    let storedEmail = '';
    let photoURL = '';
    let centerName = '';
    const userDocRef = doc(db, "users", user.uid);

    try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            fullName = data.name || fullName;
            mobileNumber = data.number || mobileNumber;
            email = user.email || data.email || email;
            address = data.address || '';
            pendingEmail = data.pendingEmail || '';
            storedEmail = data.email || '';
            photoURL = data.photoURL || '';
            centerName = data.centerName || '';
        }
    } catch (err) {
        console.warn("Could not retrieve profile from database, using defaults.", err);
    }

    // Ignore an async profile response if the account changed while it was loading.
    if (auth.currentUser?.uid !== user.uid) return;

    // Finish syncing Firestore after a user verifies a requested email change.
    if (user.email && storedEmail !== user.email) {
        const profileSync = { email: user.email, updatedAt: serverTimestamp() };
        if (pendingEmail === user.email) {
            profileSync.pendingEmail = deleteField();
            pendingEmail = '';
        }
        try {
            await setDoc(userDocRef, profileSync, { merge: true });
        } catch (err) {
            console.warn('Could not sync the verified email to the profile document.', err);
        }
        if (auth.currentUser?.uid !== user.uid) return;
    }

    document.getElementById('welcome-user-greeting').innerText = `Hello, ${fullName}`;
    document.getElementById('disp-fullname').innerText = fullName;
    document.getElementById('disp-number').innerText = mobileNumber;
    document.getElementById('disp-email').innerText = email;
    userProfile = { name: fullName, number: mobileNumber, email, address, pendingEmail, photoURL, centerName };
    populateProfileForm();

    window.closeAuthModal?.();
    const headerLoginBtn = document.getElementById('header-login-btn');
    if (headerLoginBtn) headerLoginBtn.classList.add('hidden');
    const footerLoginBtn = document.getElementById('footer-login-btn');
    if (footerLoginBtn) footerLoginBtn.classList.add('hidden');
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.remove('hidden');

    welcomeScreen.classList.remove('hidden');
    startDashboardSubscriptions(user);
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerAlert.innerHTML = '';

    const name = document.getElementById('reg-name').value.trim();
    const number = document.getElementById('reg-number').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    const registerBtn = document.getElementById('register-btn');
    registerBtn.innerText = "Registering...";
    registerBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            number: number,
            email: email,
            createdAt: new Date().toISOString()
        });

        await signOut(auth);
        registerScreen.classList.add('hidden');
        registerScreen.style.display = 'none';
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = 'block';
        loginAlert.innerHTML = `<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2 mb-3 shadow-sm"><i class="fa-solid fa-circle-check text-emerald-600 text-sm shrink-0"></i><span>Registration successful! Please log in.</span></div>`;
        registerForm.reset();
    } catch (error) {
        registerAlert.textContent = error.message.replace('Firebase: ', '');
    } finally {
        registerBtn.innerText = "Register";
        registerBtn.disabled = false;
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.innerHTML = '';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const loginBtn = document.getElementById('login-btn');
    loginBtn.innerText = "Logging in...";
    loginBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
        window.closeAuthModal?.();
    } catch (error) {
        loginAlert.innerHTML = `<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2 mb-3 shadow-sm"><i class="fa-solid fa-circle-exclamation text-rose-500 shrink-0"></i><span>Invalid email or password.</span></div>`;
    } finally {
        loginBtn.innerText = "Login";
        loginBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.openAuthModal?.('You have been logged out.');
});

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await loadUserData(user);
        window.AppRouter?.apply(window.AppRouter.read());
        return;
    }
    stopDashboardSubscriptions();
    customers = [];
    transactions = [];
    userProfile = null;

    document.getElementById('welcome-user-greeting').innerText = 'Welcome, Guest!';
    document.getElementById('disp-fullname').innerText = 'Guest User';
    document.getElementById('disp-number').innerText = '—';
    document.getElementById('disp-email').innerText = 'Guest Mode (Login required for database & reports)';

    const headerLoginBtn = document.getElementById('header-login-btn');
    if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
    const footerLoginBtn = document.getElementById('footer-login-btn');
    if (footerLoginBtn) footerLoginBtn.classList.remove('hidden');
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.add('hidden');

    welcomeScreen.classList.remove('hidden');
    renderCustomers();
    renderTransactions();
    updateDashboardStats();
    if (window.AppRouter) window.AppRouter.apply(window.AppRouter.read());
});
