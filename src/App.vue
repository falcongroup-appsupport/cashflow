<template>
<v-app>
 <v-main v-if="!authenticated" class="login-page">
  <v-container class="fill-height d-flex align-center justify-center" fluid>
   <v-card class="login-card pa-4 pa-sm-8" width="460" max-width="100%">
    <div class="d-flex align-center ga-3 mb-6">
     <v-avatar color="primary" size="48"><v-icon icon="mdi-bank-transfer" size="28"/></v-avatar>
     <div><div class="text-h5 font-weight-bold">Cash Flow Control Center</div><div class="text-body-2 text-medium-emphasis">Sign in to continue</div></div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" density="comfortable" class="mb-4">{{ error }}</v-alert>
    <v-form @submit.prevent="login">
     <v-text-field v-model="username" label="Username" prepend-inner-icon="mdi-account-outline" autocomplete="username" variant="outlined" autofocus :disabled="loginBusy" />
     <v-text-field v-model="password" label="Password" prepend-inner-icon="mdi-lock-outline" type="password" autocomplete="current-password" variant="outlined" class="mt-2" :disabled="loginBusy" />
     <v-btn type="submit" color="primary" block size="large" class="mt-4" :loading="loginBusy">Sign in</v-btn>
    </v-form>
    <div class="text-caption text-medium-emphasis mt-5">Access is verified by the server. Your role determines which actions are permitted.</div>
   </v-card>
  </v-container>
 </v-main>
 <template v-else>
 <v-app-bar color="primary" density="comfortable"><v-app-bar-title>Cash Flow Control Center</v-app-bar-title><v-spacer/><v-btn variant="text" @click="signOut">Sign out</v-btn></v-app-bar>
 <v-navigation-drawer permanent width="250">
  <v-list nav density="comfortable" v-model:selected="selectedNav">
   <v-list-item v-for="m in visibleModules" :key="m.key" :value="m.key" :title="m.title" :prepend-icon="m.icon" @click="selectModule(m.key)"/>
  </v-list>
  <v-divider/><v-list-item title="Current role" :subtitle="role"/>
 </v-navigation-drawer>
 <v-main><v-container fluid>
  <v-alert v-if="error" type="error" closable class="mb-4" @click:close="error=''">{{error}}</v-alert>
  <template v-if="current==='cashflow'">
   <v-row class="mb-3"><v-col cols="12" md="3"><v-text-field v-model="reportDate" type="date" label="Report date" @update:model-value="loadCashflow"/></v-col><v-col cols="12" md="3"><v-select v-model="companyId" :items="companyOptions" item-title="name" item-value="id" label="Company filter" clearable @update:model-value="loadCashflow"/></v-col></v-row>
   <v-row><v-col v-for="card in cashCards" :key="card.key" cols="12" sm="6" md="3"><v-card variant="tonal" class="pa-4"><div class="text-caption">{{card.label}}</div><div class="text-h5 font-weight-bold">{{money(cashflow[card.key])}}</div></v-card></v-col></v-row>
   <v-card class="mt-5"><v-card-title>Daily Cash Flow — {{reportDate}}</v-card-title><div class="table-scroll"><v-table density="compact" class="excel-table"><thead><tr><th v-for="h in cashHeaders" :key="h.key">{{h.title}}</th></tr></thead><tbody><tr v-for="(r,i) in cashBankRows" :key="r.rowKey || i"><td v-for="h in cashHeaders" :key="h.key" :class="h.numeric?'text-right':''">{{h.numeric?money(r[h.key]):(r[h.key] ?? '')}}</td></tr><tr v-if="!cashBankRows.length"><td :colspan="cashHeaders.length" class="text-center pa-6">No bank balance records found for this date.</td></tr></tbody><tfoot v-if="cashBankRows.length"><tr><th v-for="h in cashHeaders" :key="h.key" :class="h.numeric?'text-right':''">{{h.total ? money(cashBankRows.reduce((sum,row)=>sum+Number(row[h.key]||0),0)) : (h.key==='businessEntity'?'TOTAL':'') }}</th></tr></tfoot></v-table></div><v-card-actions><v-btn @click="exportCsv('cashflow')">Export CSV</v-btn></v-card-actions></v-card>
  </template>
  <template v-else>
   <div class="d-flex align-center ga-3 mb-4 flex-wrap"><div class="text-h5">{{moduleTitle}}</div><v-spacer/><v-select v-if="current!=='users' && current!=='companies'" v-model="companyId" :items="companyOptions" item-title="name" item-value="id" label="Company" clearable density="compact" class="toolbar-company-select" @update:model-value="loadRows"/><v-btn color="primary" prepend-icon="mdi-plus" @click="newRecord">Add record</v-btn><v-btn variant="outlined" prepend-icon="mdi-download" @click="exportCsv(current)">Export CSV</v-btn></div>
   <v-tabs v-if="current!=='users' && current!=='companies'" v-model="tabCompany" @update:model-value="tabChanged" class="mb-3" show-arrows><v-tab value="all">All companies</v-tab><v-tab v-for="c in companies" :key="c.id" :value="String(c.id)">{{c.name}}</v-tab></v-tabs>
   <v-text-field v-model="search" label="Search displayed records" prepend-inner-icon="mdi-magnify" clearable density="compact" class="mb-2" />
   <v-card><v-table density="compact"><thead><tr><th v-for="h in headers" :key="h.key">{{h.title}}</th><th>Actions</th></tr></thead><tbody>
    <tr v-for="row in filteredRows" :key="row.id"><td v-for="h in headers" :key="h.key">{{formatCell(row[h.key])}}</td><td><v-btn icon="mdi-pencil" size="small" variant="text" @click="editRecord(row)"/><v-btn v-if="['companies','bank-accounts','users','cheques','tt','ic'].includes(current)" icon="mdi-delete" size="small" variant="text" color="error" @click="deleteRecord(row)"/></td></tr>
    <tr v-if="filteredRows.length===0"><td :colspan="headers.length+1" class="text-center pa-6">No records found. Use Add record to begin.</td></tr>
   </tbody><tfoot v-if="['cheques','tt','ic','loans','salary'].includes(current)"><tr><th :colspan="Math.max(1,headers.length-2)">Displayed subtotal</th><th>{{money(subtotal)}}</th><th></th></tr></tfoot></v-table></v-card>
   <v-card v-if="current==='ic'" variant="outlined" class="mb-3 pa-3"><div class="d-flex align-center ga-3 flex-wrap"><div class="text-subtitle-1 font-weight-medium">IC month headings</div><v-text-field v-model="icMonthDate" type="date" label="Effective date" density="compact" hide-details style="max-width:220px" @update:model-value="loadMonthHeaders"/><v-spacer/><v-btn color="primary" variant="tonal" @click="saveMonthHeaders">Save month headings</v-btn></div><v-row dense class="mt-2"><v-col v-for="slot in 5" :key="slot" cols="12" sm="6" md="2"><v-text-field v-model="icMonths[slot-1]" type="month" :label="`Month ${slot}`" density="compact" hide-details @change="monthHeadersDirty=true"/></v-col></v-row><div class="text-caption mt-2">Headings are saved by effective date and displayed as columns in the register below.</div></v-card>
  </template>
 </v-container></v-main>

 <v-dialog v-model="editor" max-width="1500" scrollable><v-card><v-card-title>{{editing?'Edit':'Add'}} {{moduleTitle}}</v-card-title><v-card-text class="entry-grid"><v-row dense>
  <v-col v-for="f in formFields" :key="f.key" cols="12" sm="6" md="4" lg="3" xl="2"><v-select v-if="f.type==='company'" v-model="form[f.key]" :items="companyOptions" item-title="name" item-value="id" :label="f.title" variant="outlined" density="comfortable" hide-details="auto"/><v-select v-else-if="f.type==='bank'" v-model="form[f.key]" :items="bankOptions" item-title="bank" item-value="bank" :label="f.title" variant="outlined" density="comfortable" hide-details="auto"/><v-select v-else-if="f.type==='role'" v-model="form[f.key]" :items="roles" :label="f.title" variant="outlined" density="comfortable" hide-details="auto"/><v-switch v-else-if="f.type==='boolean'" v-model="form[f.key]" :label="f.title" color="primary" hide-details="auto"/><v-select v-else-if="f.key==='chequeType'" v-model="form[f.key]" :items="['CDC','PDC']" :label="f.title" variant="outlined" density="comfortable" hide-details="auto"/><v-text-field v-else v-model="form[f.key]" :label="f.title" :type="f.type||'text'" variant="outlined" density="comfortable" persistent-placeholder/></v-col>
 </v-row></v-card-text><v-card-actions><v-spacer/><v-btn @click="editor=false">Cancel</v-btn><v-btn color="primary" @click="saveRecord">Save</v-btn></v-card-actions></v-card></v-dialog>
</template>
</v-app>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import axios from 'axios'
const modules=[
 {key:'cashflow',title:'Cash Flow',icon:'mdi-chart-box'},
 {key:'companies',title:'Companies',icon:'mdi-domain'},
 {key:'bank-accounts',title:'Bank Accounts',icon:'mdi-bank'},
 {key:'gl-bank-balances',title:'GL & Bank Balance',icon:'mdi-scale-balance'},
 {key:'cheques',title:'CDC / PDC Issued',icon:'mdi-receipt-text'},
 {key:'tt',title:'TT Register',icon:'mdi-bank-transfer'},
 {key:'ic',title:'IC Settlement',icon:'mdi-swap-horizontal'},
 {key:'loans',title:'Vehicle Loans / SI Auto Debit',icon:'mdi-car-clock'},
 {key:'salary',title:'Projected Salary',icon:'mdi-cash-multiple'},
 {key:'users',title:'User Management',icon:'mdi-account-cog'}
]
const fields={
 companies:[['code','Code'],['name','Company name'],['active','Active','boolean']],
 'bank-accounts':[['companyId','Company'],['bank','Bank'],['accountNumber','Account number'],['glCode','GL code'],['description','Description']],
 'gl-bank-balances':[['companyId','Company'],['balanceDate','Date','date'],['code','Code'],['businessEntity','Business Entity'],['bank','Bank'],['accountNumber','Account number'],['glCode','GL code'],['description','Description'],['glAmount','GL amount','number'],['bankAmount','As per bank','number']],
 cheques:[['companyId','Company'],['entity','Entity'],['chequeNo','Chq No.'],['chequeDate','Chq Date','date'],['issuedDate','Issued Date','date'],['bank','Bank'],['chequeType','PDC/CDC'],['amount','Amount','number'],['clearedAmount','Cleared','number'],['clearedDate','Cleared Date','date'],['remarks','Remarks']],
 tt:[['companyId','Company'],['bpvNo','BPV#'],['bpvDate','BPV Date','date'],['supplierName','Supplier Name'],['bank','Bank'],['amountAed','Amount','number'],['clearedDate','Cleared Date','date'],['cumulative','Cumulative','number'],['remarks','Remarks']],
 ic:[['companyId','Company'],['bpvNo','BPV#'],['bpvDate','BPV Date','date'],['intercompanyName','Intercompany Name'],['bank','Bank'],['month1Amount','Month 1 amount','number'],['month2Amount','Month 2 amount','number'],['month3Amount','Month 3 amount','number'],['month4Amount','Month 4 amount','number'],['month5Amount','Month 5 amount','number'],['amountPayable','Amount Payable','number'],['amountReceivable','Amount Receivable','number'],['clearedDate','Cleared Date','date'],['remarks','Remarks']],
 loans:[['companyId','Company'],['serialNo','Srl.','number'],['vehicleLoan','Vehicle Loans'],['loanDate','Date of loan','date'],['principalAmount','Principal loan amount','number'],['emiDate','EMI date','date'],['tenureMonths','Tenure (months)','number'],['emiMonthly','EMI monthly','number'],['loanEndDate','Loan end date','date'],['emiFromBank','EMI from bank'],['signatory','Signatory'],['loanBank','Loan bank']],
 salary:[['companyId','Company','company'],['monthValue','Month','month'],['salaryPayments','Salary payments','number'],['paymentDate','Payment date','date'],['remarks','Remarks']],
 users:[['username','Username','text'],['fullName','Full name','text'],['password','Temporary password (min 14 characters)','password'],['role','Role','role'],['active','Active','boolean']],
}
const roles=['SUPER_ADMIN','ACCOUNTANT','ACCOUNTS_MANAGER','MANAGEMENT']
const selectedNav=ref(['cashflow']),current=ref('cashflow'),companies=ref([]),rows=ref([]),companyId=ref(null),tabCompany=ref('all'),search=ref(''),error=ref('')
const cashflow=ref({}),reportDate=ref(new Date().toISOString().slice(0,10)),recordDate=ref(new Date().toISOString().slice(0,10)),username=ref(''),password=ref(''),role=ref(''),authenticated=ref(false),currentUser=ref(null),activeCredentials=ref(null)
const editor=ref(false),editing=ref(false),form=ref({}),editingId=ref(null),icMonths=ref(['','','','','']),icMonthDate=ref(new Date().toISOString().slice(0,10)),monthHeadersDirty=ref(false),loginBusy=ref(false),cashBankRows=ref([])
const cashCards=[{key:'bankBalance',label:'Bank balance'},{key:'difference',label:'GL / bank difference'},{key:'totalOutflow',label:'Outstanding outflow'},{key:'totalInflow',label:'Outstanding inflow'}]
const cashRows=[{key:'glBalance',label:'Balance as per GL'},{key:'bankBalance',label:'Balance as per Bank'},{key:'difference',label:'Difference'},{key:'cdcIssued',label:'CDC issued'},{key:'siAutoDebit',label:'SI / Auto Debit'},{key:'ttTransfer',label:'TT transfer'},{key:'totalCdcSiTt',label:'Total CDC, SI & TT'},{key:'pdcIssued',label:'PDC issued'},{key:'icPayment',label:'IC payment'},{key:'totalOutflow',label:'Total outflow'},{key:'icReceipt',label:'IC receipt'},{key:'totalInflow',label:'Total inflow'},{key:'bankPositionBeforePdcIc',label:'Bank position before PDC & IC'},{key:'bankPositionAfterPdcIc',label:'Bank position after PDC & IC'}]
const cashHeaders=[
 {key:'code',title:'Code'}, {key:'businessEntity',title:'Business Entity'}, {key:'bank',title:'Bank'}, {key:'accountNumber',title:'Account Number'},
 {key:'glBalance',title:'Balance as per GL',numeric:true,total:true}, {key:'bankBalance',title:'Balance as per Bank',numeric:true,total:true}, {key:'difference',title:'Difference',numeric:true,total:true},
 {key:'cdcIssued',title:'CDC Issued',numeric:true,total:true}, {key:'siAutoDebit',title:'SI / Auto Debit',numeric:true,total:true}, {key:'ttTransfer',title:'TT Transfer',numeric:true,total:true}, {key:'totalCdcSiTt',title:'Total CDC, SI & TT',numeric:true,total:true}, {key:'pdcIssued',title:'PDC Issued',numeric:true,total:true}, {key:'icPayment',title:'IC Payment',numeric:true,total:true}, {key:'totalOutflow',title:'Total Outflow',numeric:true,total:true}, {key:'cdcReceived',title:'CDC Received',numeric:true,total:true}, {key:'pdcReceived',title:'PDC Received',numeric:true,total:true}, {key:'collection',title:'Collection',numeric:true,total:true}, {key:'icReceipt',title:'IC Receipt',numeric:true,total:true}, {key:'totalInflow',title:'Total Inflow',numeric:true,total:true}, {key:'bankPositionBeforePdcIc',title:'Bank Position Before PDC & IC',numeric:true,total:true}, {key:'bankPositionAfterPdcIc',title:'Bank Position After PDC & IC',numeric:true,total:true}, {key:'projectedPayments',title:'Projected Payments',numeric:true,total:true}, {key:'projectedSalaryPayments',title:'Projected Salary Payments',numeric:true,total:true}, {key:'projectedReceipts',title:'Projected Receipts',numeric:true,total:true}, {key:'totalProjectedBankPosition',title:'Total Projected Bank Position',numeric:true,total:true}, {key:'action',title:'Action'}
]
const visibleModules=computed(()=>{ if(role.value==='MANAGEMENT') return modules.filter(m=>m.key==='cashflow'); return modules.filter(m=>{ if(m.key==='users' && role.value!=='SUPER_ADMIN') return false; if(role.value==='ACCOUNTANT' && ['cashflow','gl-bank-balances','salary'].includes(m.key)) return false; return true }) })
const moduleTitle=computed(()=>modules.find(m=>m.key===current.value)?.title||current.value)
const formFields=computed(()=> {
 let source=fields[current.value]||[]
 if(current.value==='ic') source=source.filter(([key])=>role.value==='ACCOUNTANT' ? !['amountPayable','amountReceivable','intercompanyName'].includes(key) : !key.startsWith('month'))
 return source.map(([key,title,type='text'])=>({key,title:current.value==='ic' && key.startsWith('month') && key.endsWith('Amount') ? (icMonths.value[Number(key.match(/month(\d)/)?.[1])-1] || title) : title,type:key==='companyId'?'company':key==='bank' && current.value!=='bank-accounts'?'bank':type}))
})
const headers=computed(()=>{
 if(current.value==='companies')return [{key:'code',title:'Code'},{key:'name',title:'Company name'},{key:'active',title:'Active'}]
 if(current.value==='bank-accounts')return [{key:'company_name',title:'Company'},...['bank','account_number','gl_code','description'].map(k=>({key:k,title:k.replaceAll('_',' ')}))]
 const keys={ 'gl-bank-balances':['balance_date','code','business_entity','bank','account_number','gl_code','description','gl_amount','bank_amount','difference_amount'],
cheques: [
  'company_name',
  'cheque_no',
  'cheque_date',
  'issued_date',
  'bank',
  'cheque_type',
  'amount',
  'cleared_amount',
  'balance',
  'status',
  'cleared_date',
  'remarks'
],
tt:['company_name','bpv_no','bpv_date','supplier_name','bank','amount_aed','cleared_date','cumulative','remarks'],ic: role.value==='ACCOUNTANT' ? ['company_name','bpv_no','bpv_date','bank','month1_amount','month2_amount','month3_amount','month4_amount','month5_amount','cleared_date'] : ['company_name','bpv_no','bpv_date','intercompany_name','bank','amount_payable','amount_receivable','cleared_date','remarks'],loans:['serial_no','company_name','vehicle_loan','loan_date','principal_amount','emi_date','tenure_months','emi_monthly','loan_end_date','emi_from_bank','signatory','loan_bank'],salary:['company_name','month_value','salary_payments','payment_date','remarks']}
 return (keys[current.value]||[]).map(k=>({key:k,title:k.startsWith('month') && current.value==='ic' ? (icMonths.value[Number(k.match(/month(\d)/)?.[1])-1] || `Month ${k.match(/month(\d)/)?.[1]}`) : k==='company_name' ? 'Entity / Company' : k.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}))
})
const filteredRows = computed(() => {
  const query = String(search.value ?? '').toLowerCase().trim()

  return (rows.value ?? []).filter(row => {
    if (!row) return false

    const rowText = Object.values(row)
      .map(value => String(value ?? ''))
      .join(' ')
      .toLowerCase()

    return rowText.includes(query)
  })
})
const subtotal=computed(()=>{const k={cheques:'amount',tt:'amount_aed',ic:'month1_amount',loans:'principal_amount',salary:'salary_payments'}[current.value];return filteredRows.value.reduce((s,r)=>s+Number(r[k]||0),0)})
const companyOptions=computed(()=>companies.value.map(c=>({id:c.id,name:c.name})))
const bankAccounts=ref([])
const bankOptions=computed(()=>{const cid=Number(form.value.companyId||companyId.value||0);return [...new Set(bankAccounts.value.filter(b=>!cid||Number(b.company_id||b.companyId)===cid).map(b=>b.bank).filter(Boolean))].map(bank=>({bank}))})
function money(v){return Number(v||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}
function formatCell(v){if(v===true||v===1)return 'Yes';if(v===false||v===0)return 'No';if(v==null)return '';return v}
function auth() {
  if (!activeCredentials.value) {
    throw new Error('Sign in before making changes.')
  }
  // Reapply the credentials for every protected API call. Do not read from the login form,
  // because its password field is cleared after a successful login.
  axios.defaults.auth = { ...activeCredentials.value }
}

async function login() {
  if (loginBusy.value) return
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Enter your username and password.'
    return
  }

  loginBusy.value = true
  // Always replace credentials so a previous administrator's credentials cannot be reused.
  delete axios.defaults.auth
  const credentials = { username: username.value.trim(), password: password.value }

  try {
    const me = await axios.get('/api/me', { auth: credentials })
    currentUser.value = me.data
    role.value = me.data.role || ''
    if (role.value === 'ACCOUNTANT') { current.value = 'cheques'; selectedNav.value = ['cheques'] }
    else { current.value = 'cashflow'; selectedNav.value = ['cashflow'] }
    activeCredentials.value = credentials
    axios.defaults.auth = credentials

    const response = await axios.get('/api/companies')
    if (!Array.isArray(response.data)) throw new Error('Unexpected response from /api/companies')
    companies.value = response.data
    if (role.value !== 'MANAGEMENT') { try { bankAccounts.value = (await axios.get('/api/bank-accounts')).data } catch (_) { bankAccounts.value = [] } }
    authenticated.value = true
    password.value = ''
    if (role.value !== 'ACCOUNTANT') await loadCashflow()
  } catch (e) {
    delete axios.defaults.auth
    activeCredentials.value = null
    currentUser.value = null
    role.value = ''
    authenticated.value = false
    error.value = e.response?.status === 401
      ? 'Sign-in failed. Check this user’s username, password, and active status.'
      : e.response?.status === 403
        ? 'This user does not have permission to access this module.'
        : e.response?.data?.message || e.message || 'Unable to connect to the Cash Flow server.'
  } finally {
    loginBusy.value = false
  }
}

function signOut() {
  delete axios.defaults.auth
  activeCredentials.value = null
  currentUser.value = null
  role.value = ''
  username.value = ''
  authenticated.value = false
  password.value = ''
  companies.value = []
  rows.value = []
  cashflow.value = {}
  error.value = ''
}

function selectModule(k){if(k==='users'&&role.value!=='SUPER_ADMIN'){error.value='Only a Super Admin can manage users.';return}if(role.value==='ACCOUNTANT'&&['cashflow','gl-bank-balances','salary'].includes(k)){error.value='This module is not available to the Accountant role.';return}current.value=k;selectedNav.value=[k];companyId.value=null;tabCompany.value='all';error.value='';if(k==='cashflow')loadCashflow();else loadRows()}
async function loadAll() {
  try {
    auth()
    companies.value = await axios.get('/api/companies').then(r => r.data)
    await loadCashflow()
    if (current.value !== 'cashflow') await loadRows()
  } catch (e) {
    error.value = e.response?.status === 401
      ? 'Sign-in required. Enter your backend username and password.'
      : e.response?.data?.message || e.message || 'Unable to load data.'
    throw e
  }
}

async function loadRows() {
  if (current.value === 'cashflow') return
  try {
    const params = {}
    if (companyId.value) params.companyId = companyId.value
    rows.value = await axios.get('/api/' + current.value, { params }).then(r => r.data)
    if (current.value === 'tt') { let running = 0; rows.value = [...rows.value].reverse().map(row => { const amount = row.cleared_date ? 0 : Number(row.amount_aed || 0); running += amount; return {...row, cumulative: running} }).reverse() }
    if (current.value === 'ic') { await loadMonthHeaders() }
  } catch (e) {
    if (e.response?.status === 401) { signOut(); error.value = 'Session ended. Please sign in again.'; return }
    error.value = e.response?.status === 403
      ? 'Your role does not have permission to view this module.'
      : e.response?.data?.message || 'Unable to load records.'
  }
}

async function loadCashflow() {
  try {
    const params = { date: reportDate.value }
    if (companyId.value) params.companyId = companyId.value
    cashflow.value = await axios.get('/api/cashflow', { params }).then(r => r.data)
    cashBankRows.value = await axios.get('/api/cashflow/rows', { params }).then(r => r.data)
  } catch (e) {
    if (e.response?.status === 401) { signOut(); error.value = 'Session ended. Please sign in again.'; return }
    error.value = e.response?.status === 403
      ? 'Your role does not have permission to view cash flow.'
      : e.response?.data?.message || 'Unable to load cash flow.'
  }
}

function tabChanged(v){companyId.value=v==='all'?null:Number(v);loadRows()}
function newRecord(){editing.value=false;editingId.value=null;form.value={companyId:companyId.value||null,active:true};if(current.value==='users')form.value={active:true,role:'ACCOUNTANT'};editor.value=true}
function toCamelKey(key) { return key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase()) }
function editRecord(r) {
  editing.value = true
  editingId.value = r.id
  const mapped = {}
  for (const [key, value] of Object.entries(r)) mapped[toCamelKey(key)] = value
  // Do not prefill or expose password hashes when editing users.
  delete mapped.passwordHash
  delete mapped.password
  if (current.value === 'users') mapped.fullName = r.full_name ?? r.fullName ?? ''
  if (mapped.companyId != null) mapped.companyId = Number(mapped.companyId)
  if (current.value === 'salary' && mapped.monthValue) mapped.monthValue = String(mapped.monthValue).slice(0, 7)
  form.value = mapped
  editor.value = true
}
async function saveRecord(){try{auth();const payload={...form.value};if(current.value==='ic'){const co=companies.value.find(c=>Number(c.id)===Number(payload.companyId));if(co)payload.entity=co.name;}delete payload.id;delete payload.company_name;delete payload.company_id;delete payload.full_name;if(current.value==='users'&&!payload.password)delete payload.password;if(editing.value)await axios.put(`/api/${current.value}/${editingId.value}`,payload);else await axios.post('/api/'+current.value,payload);editor.value=false;if(current.value==='companies'){companies.value=await axios.get('/api/companies').then(r=>r.data)}await loadRows();await loadCashflow()}catch(e){error.value=e.response?.data?.message||e.response?.data?.error||`Save failed (${e.response?.status||'network error'}). Check the backend log for details.`}}
async function deleteRecord(r){if(!confirm('Mark this record as void?'))return;try{auth();await axios.delete(`/api/${current.value}/${r.id}`);await loadRows()}catch(e){error.value=e.response?.data?.message||'Delete failed.'}}
function exportCsv(m){try{auth()}catch(e){error.value=e.message;return}const params={};if(companyId.value)params.companyId=companyId.value;if(m==='cashflow')params.date=reportDate.value;axios.get('/api/'+m+'/export',{params,responseType:'blob'}).then(r=>{const url=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=url;a.download=m+'.csv';a.click();URL.revokeObjectURL(url)}).catch(e=>{error.value=e.response?.status===401?'Sign in again to export.':'Export failed.'})}
async function loadMonthHeaders(){
 try { const r=await axios.get('/api/ic/month-settings',{params:{date:icMonthDate.value}}); icMonths.value=(r.data.months||[]).map(v=>v||'').concat(['','','','','']).slice(0,5); monthHeadersDirty.value=false }
 catch(e){ error.value=e.response?.data?.message||'Unable to load IC month headings.' }
}
async function saveMonthHeaders(){
 try { auth(); await axios.put('/api/ic/month-settings',{effectiveDate:icMonthDate.value,months:icMonths.value}); monthHeadersDirty.value=false; error.value=''; }
 catch(e){error.value=e.response?.data?.message||e.response?.data?.error||'Unable to save IC month headings.'}
}
onMounted(() => { /* Do not request protected data until the user signs in. */ })
</script>
<style>
html, body, #app { min-height: 100%; margin: 0; background: #f4f7fb; }
.entry-grid .v-field-label, .entry-grid label { opacity: 1 !important; }
.entry-grid .v-input { min-width: 0; }
.entry-grid .v-field { background: #fff; }
.entry-grid .v-field__outline { --v-field-border-opacity: .55; }
.login-page { min-height: 100vh; background: radial-gradient(circle at top left, #e4edff 0, #f4f7fb 48%, #edf2f9 100%); }
.login-card { border: 1px solid #e3eaf4; border-radius: 20px !important; box-shadow: 0 24px 70px rgba(30, 64, 120, .14) !important; }
.v-app-bar { box-shadow: 0 2px 12px rgba(15, 23, 42, .08) !important; }
.v-navigation-drawer { border-right: 1px solid #e5eaf2 !important; }
.v-card { border-radius: 12px !important; }
.v-table th { white-space: nowrap; }
.table-scroll { overflow-x: auto; width: 100%; } .excel-table { min-width: 2100px; } .excel-table th { background: #eaf0f7; white-space: nowrap; } .excel-table td { white-space: nowrap; }
.toolbar-date-select { width: 190px; max-width: 190px; flex: 0 0 190px; }
.toolbar-company-select { width: 260px; max-width: 260px; flex: 0 0 260px; }
.toolbar-company-select .v-field { min-height: 40px; }
.entry-grid .v-row { align-items: flex-start; }
.text-right { text-align: right; }
</style>
