import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, SafeAreaView, StatusBar, Alert, Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'clubledger.v1';
const C = { bg: '#FDF9F2', card: '#FFFFFF', ink: '#1B2A2F', muted: '#6A7A80', line: '#E9E2D4', teal: '#1FA39A', orange: '#F7931E', pink: '#F0488F', purple: '#7B5EA7' };
const pad = (n) => String(n).padStart(2, '0');
const money = (x) => (x < 0 ? '−' : '') + Math.abs(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function App() {
  const now = new Date();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState({ members: [], payments: {}, expenses: [] });
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [tab, setTab] = useState('fees');
  const [form, setForm] = useState(null); // {type:'member'|'expense', item?}
  const [f, setF] = useState({});

  useEffect(() => { AsyncStorage.getItem(KEY).then((raw) => { if (raw) { try { setData(JSON.parse(raw)); } catch (e) {} } setReady(true); }); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {}); }, [data, ready]);

  const mk = `${ym.y}-${pad(ym.m + 1)}`;
  const { members, payments, expenses } = data;
  const collected = Object.values(payments).reduce((a, b) => a + b, 0);
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  const monthIn = Object.entries(payments).filter(([k]) => k.startsWith(mk + '|')).reduce((a, [, v]) => a + v, 0);
  const monthOut = expenses.filter((e) => e.date.startsWith(mk)).reduce((a, e) => a + e.amount, 0);
  const due = members.filter((x) => payments[`${mk}|${x.id}`] === undefined).reduce((a, x) => a + x.fee, 0);

  const shift = (d) => { let m = ym.m + d, y = ym.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setYm({ y, m }); };
  const togglePay = (x) => setData((d) => { const p = { ...d.payments }, k = `${mk}|${x.id}`; if (p[k] !== undefined) delete p[k]; else p[k] = x.fee; return { ...d, payments: p }; });
  const confirm = (title, msg, fn) => Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: fn }]);

  const openMember = (item) => { setF({ name: item ? item.name : '', fee: item ? String(item.fee) : '' }); setForm({ type: 'member', item }); };
  const openExpense = () => { setF({ desc: '', amount: '', date: `${mk}-${pad(Math.min(now.getDate(), 28))}` }); setForm({ type: 'expense' }); };

  const saveForm = () => {
    if (form.type === 'member') {
      const fee = parseFloat(f.fee);
      if (!f.name.trim() || isNaN(fee) || fee < 0) return Alert.alert('Check the form', 'Enter a name and a monthly fee.');
      setData((d) => ({ ...d, members: form.item ? d.members.map((x) => (x.id === form.item.id ? { ...x, name: f.name.trim(), fee } : x)) : [...d.members, { id: uid(), name: f.name.trim(), fee }] }));
    } else {
      const amount = parseFloat(f.amount);
      if (!f.desc.trim() || isNaN(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return Alert.alert('Check the form', 'Enter a description, an amount and a date as YYYY-MM-DD.');
      setData((d) => ({ ...d, expenses: [...d.expenses, { id: uid(), desc: f.desc.trim(), amount, date: f.date }] }));
    }
    setForm(null);
  };

  const exportCsv = () => {
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = ['type,month_or_date,name_or_description,amount'];
    Object.keys(payments).sort().forEach((k) => { const [m, id] = k.split('|'); const mem = members.find((x) => x.id === id); rows.push(['fee', m, q(mem ? mem.name : '(removed member)'), payments[k]].join(',')); });
    expenses.forEach((e) => rows.push(['expense', e.date, q(e.desc), e.amount].join(',')));
    Share.share({ message: rows.join('\n'), title: 'Friends 7s Kombanad ledger' });
  };

  const monthExpenses = expenses.filter((e) => e.date.startsWith(mk)).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <Image source={require('./assets/logo.png')} style={s.logo} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Friends 7s Kombanad</Text>
            <Text style={s.sub}>Club ledger</Text>
          </View>
        </View>

        <View style={s.bal}>
          <Text style={s.balLabel}>Club balance</Text>
          <Text style={s.balBig}>{money(collected - spent)}</Text>
          <Text style={s.balRow}>Collected {money(collected)}   Spent {money(spent)}</Text>
          <Text style={s.balRow}>This month: in {money(monthIn)}, out {money(monthOut)}, due {money(due)}</Text>
        </View>

        <View style={s.month}>
          <TouchableOpacity style={s.nav} onPress={() => shift(-1)} accessibilityLabel="Previous month"><Text style={s.navT}>‹</Text></TouchableOpacity>
          <Text style={s.monthT}>{MONTHS[ym.m]} {ym.y}</Text>
          <TouchableOpacity style={s.nav} onPress={() => shift(1)} accessibilityLabel="Next month"><Text style={s.navT}>›</Text></TouchableOpacity>
        </View>

        <View style={s.tabs}>
          {[['fees', 'Fees'], ['exp', 'Expenses'], ['mem', 'Members']].map(([k, l]) => (
            <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}><Text style={[s.tabT, tab === k && s.tabTOn]}>{l}</Text></TouchableOpacity>
          ))}
        </View>

        {tab === 'fees' && (members.length === 0 ? <Text style={s.empty}>No members yet. Add your first member in the Members tab.</Text> :
          members.map((x) => { const paid = payments[`${mk}|${x.id}`] !== undefined; return (
            <View key={x.id} style={s.item}>
              <View style={{ flex: 1 }}><Text style={s.name}>{x.name}</Text><Text style={s.small}>{money(x.fee)} per month</Text></View>
              <TouchableOpacity style={paid ? s.paid : s.unpaid} onPress={() => togglePay(x)}><Text style={paid ? s.paidT : s.unpaidT}>{paid ? 'Paid ✓' : 'Mark paid'}</Text></TouchableOpacity>
            </View>); }))}

        {tab === 'exp' && (<>
          <TouchableOpacity style={s.primary} onPress={openExpense}><Text style={s.primaryT}>Add expense</Text></TouchableOpacity>
          {monthExpenses.length === 0 && <Text style={s.empty}>No expenses recorded for this month.</Text>}
          {monthExpenses.map((e) => (
            <View key={e.id} style={s.item}>
              <View style={{ flex: 1 }}><Text style={s.name}>{e.desc}</Text><Text style={s.small}>{e.date}</Text></View>
              <Text style={s.amt}>{money(e.amount)}</Text>
              <TouchableOpacity style={s.x} onPress={() => confirm('Remove expense?', e.desc, () => setData((d) => ({ ...d, expenses: d.expenses.filter((y) => y.id !== e.id) })))}><Text style={s.xT}>×</Text></TouchableOpacity>
            </View>))}
        </>)}

        {tab === 'mem' && (<>
          <TouchableOpacity style={s.primary} onPress={() => openMember(null)}><Text style={s.primaryT}>Add member</Text></TouchableOpacity>
          {members.length === 0 && <Text style={s.empty}>Members you add will appear here.</Text>}
          {members.map((x) => (
            <View key={x.id} style={s.item}>
              <View style={{ flex: 1 }}><Text style={s.name}>{x.name}</Text><Text style={s.small}>Fee {money(x.fee)} per month</Text></View>
              <TouchableOpacity style={s.x} onPress={() => openMember(x)}><Text style={[s.xT, { fontSize: 15 }]}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={s.x} onPress={() => confirm('Remove member?', `${x.name}. Past payments stay in the totals.`, () => setData((d) => ({ ...d, members: d.members.filter((y) => y.id !== x.id) })))}><Text style={s.xT}>×</Text></TouchableOpacity>
            </View>))}
        </>)}

        <TouchableOpacity style={s.ghost} onPress={exportCsv}><Text style={s.ghostT}>Export CSV</Text></TouchableOpacity>
      </ScrollView>

      <Modal visible={!!form} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <View style={s.overlay}><View style={s.sheet}>
          {form && form.type === 'member' ? (<>
            <Text style={s.sheetT}>{form.item ? 'Edit member' : 'Add member'}</Text>
            <TextInput style={s.input} placeholder="Name" placeholderTextColor={C.muted} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
            <TextInput style={s.input} placeholder="Monthly fee" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={f.fee} onChangeText={(v) => setF({ ...f, fee: v })} />
          </>) : (<>
            <Text style={s.sheetT}>Add expense</Text>
            <TextInput style={s.input} placeholder="What was it for?" placeholderTextColor={C.muted} value={f.desc} onChangeText={(v) => setF({ ...f, desc: v })} />
            <TextInput style={s.input} placeholder="Amount" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={f.amount} onChangeText={(v) => setF({ ...f, amount: v })} />
            <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={C.muted} value={f.date} onChangeText={(v) => setF({ ...f, date: v })} />
          </>)}
          <TouchableOpacity style={s.primary} onPress={saveForm}><Text style={s.primaryT}>{form && form.type === 'member' ? 'Save member' : 'Save expense'}</Text></TouchableOpacity>
          <TouchableOpacity style={s.ghost} onPress={() => setForm(null)}><Text style={s.ghostT}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll: { padding: 16, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logo: { width: 64, height: 64, borderRadius: 14 },
  title: { fontSize: 20, fontWeight: '800', color: C.teal },
  sub: { color: C.orange, fontWeight: '700' },
  bal: { backgroundColor: C.teal, borderRadius: 16, padding: 16, marginBottom: 12 },
  balLabel: { color: '#D8F3F0', fontSize: 14 },
  balBig: { color: '#fff', fontSize: 34, fontWeight: '800' },
  balRow: { color: '#E8F8F6', fontSize: 14, marginTop: 4 },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthT: { fontSize: 18, fontWeight: '700', color: C.ink },
  nav: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  navT: { fontSize: 24, color: C.ink },
  tabs: { flexDirection: 'row', backgroundColor: C.line, borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, padding: 10, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: C.card },
  tabT: { fontWeight: '700', color: C.muted },
  tabTOn: { color: C.pink },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginBottom: 8, gap: 8 },
  name: { fontWeight: '700', color: C.ink, fontSize: 16 },
  small: { color: C.muted, fontSize: 13 },
  amt: { fontWeight: '800', color: C.ink },
  paid: { backgroundColor: C.teal, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, minWidth: 92, alignItems: 'center' },
  paidT: { color: '#fff', fontWeight: '700' },
  unpaid: { borderWidth: 1.5, borderColor: C.orange, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minWidth: 92, alignItems: 'center' },
  unpaidT: { color: '#C26A00', fontWeight: '700' },
  x: { paddingHorizontal: 8, paddingVertical: 6 },
  xT: { color: C.muted, fontSize: 22 },
  primary: { backgroundColor: C.pink, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  primaryT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ghost: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  ghostT: { color: C.ink, fontWeight: '700' },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 24 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.bg, borderRadius: 16, padding: 16 },
  sheetT: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 10 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, marginBottom: 8, color: C.ink, fontSize: 16 },
});
