import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { payrollFromAnnualSalary, TAX_YEARS, type TaxYearKey } from './src/ukTaxYears';

function parseMoneyInput(v: string) {
  // Allow "50,000" / "£50000" etc.
  const cleaned = v.replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatGBP(n: number) {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `£${n.toFixed(2)}`;
  }
}

export default function App() {
  const [salaryText, setSalaryText] = useState('50000');
  const [taxYear, setTaxYear] = useState<TaxYearKey>('2024/25');

  const result = useMemo(() => {
    const gross = parseMoneyInput(salaryText);
    return payrollFromAnnualSalary(taxYear, gross);
  }, [salaryText, taxYear]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>UK Payroll</Text>
          <Text style={styles.subtitle}>Annual salary → estimated take-home (PAYE + Employee NI)</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Tax year</Text>
            <View style={[styles.pickerWrap, Platform.OS === 'android' && { backgroundColor: '#fff', borderColor: '#ddd' }]}>
              <Picker
                selectedValue={taxYear}
                onValueChange={(v) => setTaxYear(v)}
                dropdownIconColor={Platform.OS === 'android' ? '#000' : '#e7eefc'}
                mode="dropdown"
                style={[styles.picker, Platform.OS === 'android' && styles.pickerAndroid]}
                itemStyle={Platform.OS === 'android' ? styles.pickerItemAndroid : styles.pickerItem}
              >
                {TAX_YEARS.map((y) => (
                  <Picker.Item
                    key={y.key}
                    label={y.label}
                    value={y.key}
                    color={Platform.OS === 'android' ? '#000' : '#e7eefc'}
                  />
                ))}
              </Picker>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Annual salary (gross)</Text>
            <TextInput
              value={salaryText}
              onChangeText={setSalaryText}
              keyboardType="numeric"
              placeholder="e.g. 50000"
              placeholderTextColor="#7082a6"
              style={styles.input}
            />

            <Text style={styles.disclaimer}>
              Assumes England/Wales/NI income tax bands. No pension, student loan, or benefits.
            </Text>
            {result.notes.length ? (
              <Text style={[styles.disclaimer, { color: '#ffd74a' }]}>Note: {result.notes.join(' ')}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>

            <Row label="Gross (annual)" value={formatGBP(result.grossAnnual)} />
            <Row label="Income tax (annual)" value={formatGBP(result.incomeTaxAnnual)} />
            <Row label="National Insurance (annual)" value={formatGBP(result.niAnnual)} />
            <Row label="Net pay (annual)" value={formatGBP(result.netAnnual)} strong />
            <Row label="Net pay (monthly)" value={formatGBP(result.netMonthly)} strong />

            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Take-home</Text>
                <Text style={styles.pillValue}>{result.takeHomePct.toFixed(1)}%</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Personal allowance</Text>
                <Text style={styles.pillValue}>{formatGBP(result.personalAllowance)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Row label="Taxable income" value={formatGBP(result.taxableAnnual)} />
            <Text style={styles.disclaimer}>
              Personal allowance tapers down above £100,000 and reaches £0 at £125,140.
            </Text>

            <Pressable
              style={styles.btn}
              onPress={() => {
                setSalaryText('50000');
                setTaxYear('2024/25');
              }}
            >
              <Text style={styles.btnText}>Reset to £50,000 (2024/25)</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Disclaimer: estimates only. Do not rely on this app for payroll/tax decisions. Figures vary by tax code and other factors. This app was generated/assisted by Clawdbot AI / OpenClaw and may be wrong.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0f17' },
  container: {
    padding: 16,
    paddingTop: 28,
    gap: 14,
  },
  title: {
    color: '#e7eefc',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#a9b7d6',
    marginTop: -6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#24334d',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#2c3f62',
    backgroundColor: '#0a101d',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: '#e7eefc',
    height: 48,
    backgroundColor: '#0a101d',
  },
  // Some Android devices/themes force the native picker background to white.
  // Make the selected value readable by switching to black-on-white on Android.
  pickerAndroid: {
    color: '#000',
    backgroundColor: '#fff',
  },
  pickerItem: {
    color: '#e7eefc',
  },
  pickerItemAndroid: {
    color: '#000',
  },
  label: {
    color: '#a9b7d6',
    marginBottom: 8,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2c3f62',
    backgroundColor: '#0a101d',
    color: '#e7eefc',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#e7eefc',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,51,77,0.6)',
  },
  rowLabel: {
    color: '#a9b7d6',
    flex: 1,
    paddingRight: 12,
  },
  rowValue: {
    color: '#e7eefc',
    fontWeight: '700',
  },
  rowValueStrong: {
    color: '#7aa2ff',
    fontWeight: '900',
    fontSize: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(10,16,29,0.75)',
    borderRadius: 14,
    padding: 12,
  },
  pillLabel: {
    color: '#a9b7d6',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  pillValue: {
    color: '#e7eefc',
    fontSize: 14,
    fontWeight: '900',
  },
  disclaimer: {
    color: '#a9b7d6',
    fontSize: 12,
    marginTop: 10,
  },
  btn: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c3f62',
    backgroundColor: '#0a101d',
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#e7eefc',
    fontWeight: '800',
  },
  footer: {
    color: '#7082a6',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
});
