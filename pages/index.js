import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController,
} from 'chart.js';

// Register Chart.js components including controllers
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
);

// --- Constants & Defaults ---
const DEFAULT_ANNUAL_REVENUE_Eok = 30; // 억원
const DEFAULT_PERSONNEL_COUNT = 3;
const DEFAULT_SALARY_Mil = 25; // 백만원
const DEFAULT_EQUIPMENT_UNITS = 2;
const DEFAULT_REUSE_OPTICAL = false; // Default is NEW optical needed (checkbox unchecked)
const DEFAULT_MISDETECT_REDUCTION = 80; // Percent
const DEFAULT_QUALITY_DEFECT_REDUCTION = 90; // Percent
const DEFAULT_TARGET_PERSONNEL = 1;

// --- Helper Functions ---
function formatWon(num, showUnit = true) {
  if (!isFinite(num) || isNaN(num)) {
    return showUnit ? '0 원' : '0';
  }
  // Use Math.round before formatting to avoid decimals in Won display
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.round(num));
  return showUnit ? formatted + ' 원' : formatted;
}

function formatNumberString(value) {
    if (!value) return '';
    const numberString = String(value).replace(/[^\d]/g, '');
    if (numberString.length === 0) return '';
    const num = parseInt(numberString);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-US').format(num);
}

function unformatNumber(formattedString) {
    if (typeof formattedString !== 'string') {
        formattedString = String(formattedString);
    }
    const num = parseInt(formattedString.replace(/,/g, ''));
    return isNaN(num) ? 0 : num; // Return 0 if parsing fails
}


// --- Calculation Logic ---
function calculateInspectionROI({
  personnelCount = DEFAULT_PERSONNEL_COUNT,
  salary = DEFAULT_SALARY_Mil * 1000000,
  revenue = DEFAULT_ANNUAL_REVENUE_Eok * 100000000,
  aiUnits = DEFAULT_EQUIPMENT_UNITS,
  useOptics = !DEFAULT_REUSE_OPTICAL, // Function uses `useOptics=true` for NEW optics
  misdetectReduction = DEFAULT_MISDETECT_REDUCTION / 100,
  qualityDefectReduction = DEFAULT_QUALITY_DEFECT_REDUCTION / 100,
  targetAiPersonnel = DEFAULT_TARGET_PERSONNEL,
  // Fixed internal parameters (can be adjusted if needed)
  unitLicense = 15000000,
  customDevCost = 100000000,
  trainingRate = 0.1,
  misdetectRate = 0.05,
  qualityDefectRate = 0.05,
  opticsCost = 40000000,
  maintRate = 0.1,
}) {
    // 1. 기존 비용 계산
    const laborCost = personnelCount * salary;
    const trainingCost = laborCost * trainingRate;
    const misdetectCost = revenue * misdetectRate;
    const qualityCost = revenue * (qualityDefectRate / 2); // Split for potential clarity
    const defectCost = revenue * (qualityDefectRate / 2);
    const currentTotalOpCost = laborCost + trainingCost + misdetectCost + qualityCost + defectCost;
    const currentMaintenance = 0; // Assume no existing maintenance cost
    const currentTotalCostY1 = currentTotalOpCost; // Year 1 total
    const currentTotalCostY2plus = currentTotalOpCost; // Year 2+ total (no maintenance assumed)


    // 2. AI 시스템 초기 도입 비용 계산
    const opticsCostPerUnit = useOptics ? opticsCost : 0;
    const aiUnitCost = unitLicense + opticsCostPerUnit;
    const aiTotalUnitCost = aiUnits * aiUnitCost; // Base for maintenance
    const initialInvestment = aiTotalUnitCost + customDevCost;

    // 3. 유지보수 비용 (2년차부터)
    const annualMaintenanceCost = aiTotalUnitCost * maintRate;

    // 4. AI 도입 후 비용 (감소율 적용)
    const reducedLabor = targetAiPersonnel * salary;
    const aiTrainingCost = reducedLabor * trainingRate; // Based on reduced labor
    const reducedMisdetect = misdetectCost * (1 - misdetectReduction);
    const reducedQualityDefectCost = (qualityCost + defectCost) * (1 - qualityDefectReduction);

    // AI Annual Op Costs
    const aiTotalAnnualOpCost = reducedLabor + aiTrainingCost + reducedMisdetect + reducedQualityDefectCost;

    // AI Total Costs including maintenance
    const aiTotalAnnualCostY1 = aiTotalAnnualOpCost; // No maintenance in Year 1
    const aiTotalAnnualCostY2plus = aiTotalAnnualOpCost + annualMaintenanceCost; // Maintenance from Year 2

    // 5. Savings calculation
    const annualSavingY1 = currentTotalCostY1 - aiTotalAnnualCostY1;
    const annualSavingY2plus = currentTotalCostY2plus - aiTotalAnnualCostY2plus; // Comparing Y2+ costs

    // 6. ROI 계산
    let roiYears;
    if (initialInvestment <= 0) {
        roiYears = 0; // No investment, immediate ROI technically
    } else if (annualSavingY1 <= 0 && annualSavingY2plus <= 0) {
        roiYears = Infinity; // Never recoup if savings are always non-positive
    } else if (annualSavingY1 >= initialInvestment) {
        roiYears = initialInvestment / annualSavingY1; // Recoup in Year 1
    } else if (annualSavingY2plus > 0) {
        const remaining = initialInvestment - annualSavingY1;
        roiYears = 1 + (remaining / annualSavingY2plus); // Recoup after Year 1
    } else {
        roiYears = Infinity; // Recoup impossible if Y2+ savings are non-positive
    }

    let roiDisplay = '회수 불가';
    if (isFinite(roiYears)) {
        if (roiYears <= 0) {
            roiDisplay = '즉시 회수';
        } else if (roiYears <= 1) {
           roiDisplay = roiYears.toFixed(1) + ' 년 (1년 이내)';
        } else {
           roiDisplay = roiYears.toFixed(1) + ' 년';
        }
    } else {
        roiDisplay = '회수 불가 (절감액 부족)';
    }


    // 7. TCO 계산 (5년) - Using cumulative cost approach
    const currentTCO5 = currentTotalCostY1 + currentTotalCostY2plus * 4;
    const aiTCO5 = initialInvestment + aiTotalAnnualCostY1 + aiTotalAnnualCostY2plus * 4;

    const tcoSaving = currentTCO5 - aiTCO5;
    let tcoSavingRate = 0;
    if (currentTCO5 !== 0) {
        tcoSavingRate = (tcoSaving / currentTCO5) * 100;
    }

    // --- Prepare details for table remarks ---
    const remarks = {
        labor: `인력 변화에 따른 인건비 계산 (${personnelCount}명 → ${targetAiPersonnel}명), 인당 ${formatWon(salary, false)}`,
        training: `인력 인건비의 ${trainingRate * 100}% 적용`,
        misdetect: `연 매출액 ${formatWon(revenue, false)}의 ${misdetectRate * 100}% 적용, 품질보증활동 비용`,
        quality: `연 매출액 ${formatWon(revenue, false)}의 ${qualityDefectRate * 100}% 적용, 품질검사 관련 불량비용`,
        maintenance: `초기 시스템 도입비용(${formatWon(aiTotalUnitCost, false)})의 ${maintRate * 100}% 적용`,
    };

    // --- Prepare data for chart ---
    const annualCurrentCosts = Array(5).fill(currentTotalCostY1); // Assuming constant current cost
    const annualAiOpEx = [
      aiTotalAnnualCostY1,
      aiTotalAnnualCostY2plus,
      aiTotalAnnualCostY2plus,
      aiTotalAnnualCostY2plus,
      aiTotalAnnualCostY2plus
    ];

    const cumulativeCurrentCosts = [0];
    const cumulativeAiCosts = [initialInvestment]; // Start with initial investment before year 1 OpEx
    let breakEvenYearIndex = -1;

    for (let i = 0; i < 5; i++) {
      cumulativeCurrentCosts[i+1] = cumulativeCurrentCosts[i] + annualCurrentCosts[i];
      cumulativeAiCosts[i+1] = cumulativeAiCosts[i] + annualAiOpEx[i]; // Add OpEx for the year
      if (breakEvenYearIndex === -1 && cumulativeAiCosts[i+1] < cumulativeCurrentCosts[i+1]) {
          breakEvenYearIndex = i; // 0-indexed year (0 -> Year 1)
      }
    }

    const chartDataSource = {
        labels: ['1년차', '2년차', '3년차', '4년차', '5년차'],
        annualCurrentCosts,
        annualAiOpEx,
        cumulativeCurrentCosts: cumulativeCurrentCosts.slice(1), // Remove initial 0
        cumulativeAiCosts: cumulativeAiCosts.slice(1), // Remove initial investment value (already factored in)
        breakEvenYearIndex,
    };

    return {
      // Raw Costs
      laborCost,
      trainingCost,
      misdetectCost,
      qualityCost, // For potential breakdown
      defectCost,  // For potential breakdown
      currentTotalOpCost,
      initialInvestment,
      annualMaintenanceCost,
      currentMaintenance, // 0
      aiMaintenance: annualMaintenanceCost,
      // AI Costs
      reducedLabor,
      aiTrainingCost,
      reducedMisdetect,
      reducedQualityDefectCost,
      aiTotalAnnualCostY1, // AI Total Cost Y1 (OpEx only)
      aiTotalAnnualCostY2plus, // AI Total Cost Y2+ (OpEx + Maint)
      // Savings & ROI
      annualSavingY1,
      annualSavingY2plus,
      roiYears: roiDisplay,
      // TCO
      tcoSaving: Math.round(tcoSaving),
      tcoSavingRate: +tcoSavingRate.toFixed(1), // Round to 1 decimal place
      // Totals for Table
      currentTotalCostY1,
      currentTotalCostY2plus,
      // Misc
      personnelCount, // Pass through original for remarks
      targetAiPersonnel,
      salary,
      revenue,
      trainingRate,
      misdetectRate,
      qualityDefectRate,
      maintRate,
      remarks,
      chartDataSource,
    };
}

// --- React Component ---
export default function RoiCalculatorPage() {
  const [view, setView] = useState('form'); // 'form' or 'results'

  // Chart reference
  const chartRef = useRef(null);

  // --- Input State ---
  // Store raw values for calculation, formatted strings for display
  const [annualRevenueEok, setAnnualRevenueEok] = useState(String(DEFAULT_ANNUAL_REVENUE_Eok));
  const [personnelCount, setPersonnelCount] = useState(String(DEFAULT_PERSONNEL_COUNT));
  const [salaryMil, setSalaryMil] = useState(String(DEFAULT_SALARY_Mil));
  const [equipmentUnits, setEquipmentUnits] = useState(String(DEFAULT_EQUIPMENT_UNITS));
  const [reuseOptical, setReuseOptical] = useState(!DEFAULT_REUSE_OPTICAL); // Checked = reuse = true

  // --- Slider State ---
  const [misdetectReduction, setMisdetectReduction] = useState(DEFAULT_MISDETECT_REDUCTION);
  const [qualityDefectReduction, setQualityDefectReduction] = useState(DEFAULT_QUALITY_DEFECT_REDUCTION);
  const [targetPersonnel, setTargetPersonnel] = useState(DEFAULT_TARGET_PERSONNEL);

  // --- Results State ---
  const [results, setResults] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});

  // Refs for popovers if needed later
  const popoverRefs = useRef([]);

  // --- Input Handlers ---
  const handleNumericInputChange = (setter) => (e) => {
      setter(formatNumberString(e.target.value));
  };

  // --- Slider Max Update ---
  useEffect(() => {
    const currentPersonnelNum = unformatNumber(personnelCount) || 0;
    // Update targetPersonnel state if it exceeds the new max
    if (targetPersonnel > currentPersonnelNum) {
      setTargetPersonnel(currentPersonnelNum);
    }
  }, [personnelCount, targetPersonnel]); // Rerun when personnelCount changes

  // --- Effect for chart cleanup to prevent DOM errors ---
  useEffect(() => {
    // Cleanup function to handle chart destruction
    return () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, []);

  // Handle view change with cleanup
  const handleViewChange = (newView) => {
    // Clean up chart if it exists when going from results to form
    if (view === 'results' && newView === 'form' && chartRef.current) {
      if (chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    }
    setView(newView);
  };

  // --- Calculation Trigger ---
  const handleCalculate = useCallback(() => {
    const params = {
      personnelCount: unformatNumber(personnelCount),
      salary: unformatNumber(salaryMil) * 1000000,
      revenue: unformatNumber(annualRevenueEok) * 100000000,
      aiUnits: unformatNumber(equipmentUnits),
      useOptics: !reuseOptical, // useOptics=true means NEW optics needed (checkbox unchecked)
      misdetectReduction: misdetectReduction / 100,
      qualityDefectReduction: qualityDefectReduction / 100,
      targetAiPersonnel: targetPersonnel,
    };
    const calcResults = calculateInspectionROI(params);
    setResults(calcResults);
    // Use the handleViewChange function that handles cleanup
    handleViewChange('results');
  }, [
      personnelCount, salaryMil, annualRevenueEok, equipmentUnits, reuseOptical,
      misdetectReduction, qualityDefectReduction, targetPersonnel
  ]);

  // --- Recalculate on Slider Change (only if results are shown) ---
  useEffect(() => {
    if (view === 'results') {
      handleCalculate();
    }
    // This dependency array ensures recalculation when sliders change *after* the initial calculation
  }, [misdetectReduction, qualityDefectReduction, targetPersonnel, handleCalculate, view]);


  // --- Effect for Popovers ---
  useEffect(() => {
      // Initialize popovers when results are shown
      if (view === 'results' && typeof window !== 'undefined' && window.bootstrap) {
          const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
          const newPopoverList = popoverTriggerList.map(function (popoverTriggerEl) {
              return new window.bootstrap.Popover(popoverTriggerEl);
          });
          // Store refs to destroy later
          popoverRefs.current = newPopoverList;

          // Cleanup function to destroy popovers when component unmounts or view changes
          return () => {
              popoverRefs.current.forEach(popover => popover.dispose());
              popoverRefs.current = [];
          };
      }
      // Cleanup if view changes back to form
      return () => {
          popoverRefs.current.forEach(popover => popover.dispose());
          popoverRefs.current = [];
      };
  }, [view]); // Re-run when the view changes

  // --- Chart Data Preparation ---
  useEffect(() => {
    if (results && results.chartDataSource) {
      const { labels, annualCurrentCosts, annualAiOpEx, cumulativeCurrentCosts, cumulativeAiCosts, breakEvenYearIndex } = results.chartDataSource;

      setChartData({
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: '기존 시스템 연간 비용',
            data: annualCurrentCosts,
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            yAxisID: 'yAnnual',
          },
          {
            type: 'bar',
            label: 'AI 시스템 연간 비용 (운영비)',
            data: annualAiOpEx,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            yAxisID: 'yAnnual',
          },
          {
            type: 'line',
            label: '기존 시스템 누적 비용',
            data: cumulativeCurrentCosts,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'yCumulative',
          },
          {
            type: 'line',
            label: 'AI 시스템 누적 비용',
            data: cumulativeAiCosts,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: cumulativeAiCosts.map((_, index) => index === breakEvenYearIndex ? 7 : 4),
            pointHoverRadius: 6,
            pointBackgroundColor: cumulativeAiCosts.map((_, index) => index === breakEvenYearIndex ? '#00FF00' : 'rgba(54, 162, 235, 1)'),
            pointBorderColor: cumulativeAiCosts.map((_, index) => index === breakEvenYearIndex ? '#00AA00' : 'rgba(54, 162, 235, 1)'),
            pointBorderWidth: cumulativeAiCosts.map((_, index) => index === breakEvenYearIndex ? 3 : 1),
            yAxisID: 'yCumulative',
          }
        ]
      });

      setChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
              mode: 'index',
              intersect: false,
          },
          scales: {
              x: {
                  title: { display: true, text: '년차', font: { size: 14, weight: 'bold' } },
                  ticks: { font: { size: 12 } }
              },
              yAnnual: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  beginAtZero: true,
                  title: { display: true, text: '연간 비용 (억원)', font: { size: 14, weight: 'bold' } },
                  ticks: {
                      callback: function(value) {
                          const eokWon = value / 100000000;
                          return (eokWon % 1 === 0 ? eokWon.toFixed(0) : eokWon.toFixed(1)) + ' 억';
                      },
                      font: { size: 12 }
                  },
                  grid: { drawOnChartArea: false }
              },
              yCumulative: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  beginAtZero: true,
                  title: { display: true, text: '누적 비용 (억원)', font: { size: 14, weight: 'bold' } },
                  ticks: {
                      callback: function(value) {
                          const eokWon = value / 100000000;
                          return (eokWon % 1 === 0 ? eokWon.toFixed(0) : eokWon.toFixed(1)) + ' 억원';
                      },
                      font: { size: 12 }
                  },
                  grid: { color: '#e0e0e0' }
              }
          },
          plugins: {
              title: {
                  display: true,
                  text: '5개년 연간 및 누적 비용 비교',
                  font: { size: 18, weight: 'bold' },
                  padding: { top: 10, bottom: 20 }
              },
              legend: {
                  position: 'bottom',
                  labels: { padding: 20, font: { size: 14 } }
              },
              tooltip: {
                  callbacks: {
                      label: function(context) {
                          const label = context.dataset.label || '';
                          let value = context.raw;
                          const eokWon = value / 100000000;
                          const formattedValue = eokWon % 1 === 0 ? eokWon.toFixed(0) : eokWon.toFixed(1);
                          return label + ': ' + formattedValue + ' 억원';
                      }
                  }
              }
          }
      });
    }
  }, [results]); // Re-run when results change

  // --- Percentage Change Calculation ---
    const calculatePercentageChange = (current, ai) => {
      if (!isFinite(current) || !isFinite(ai)) return { text: 'N/A', className: '' };
      if (current === 0) {
          return ai > 0 ? { text: '+Inf %', className: 'text-danger' } : { text: '0.0 %', className: '' };
      }
      const change = ((ai / current) - 1) * 100;
      const text = change.toFixed(1) + ' %';
      const className = change < 0 ? 'text-success' : (change > 0 ? 'text-danger' : '');
      return { text, className };
  };

  // --- Dynamic Analysis Text ---
  const getAnalysisText = () => {
      if (!results) return '';
      let text = '';
      const qualityImprovementSavings = (results.qualityCost + results.defectCost) - results.reducedQualityDefectCost;
      const misdetectionSavings = results.misdetectCost - results.reducedMisdetect;
      const qualityImprovementPercent = calculatePercentageChange(results.qualityCost + results.defectCost, results.reducedQualityDefectCost).text.replace('%','').trim();
      const misdetectionPercent = calculatePercentageChange(results.misdetectCost, results.reducedMisdetect).text.replace('%','').trim();


      if (results.annualSavingY1 <= 0) {
          text = '본 AI 시스템 도입은 비용 절감 효과를 기대하기 어렵습니다. 도입 전 추가 검토가 필요합니다.';
      } else {
          text = `AI 비전 도입으로 연간 <strong>${formatWon(results.annualSavingY1)}</strong>의 비용 절감이 예상되며, `;
          text += `주요 개선사항으로는 품질 관련 비용 <strong>${Math.abs(parseFloat(qualityImprovementPercent))}%</strong> 개선, `; // Use absolute value for display
          text += `오감지 비용 <strong>${Math.abs(parseFloat(misdetectionPercent))}%</strong> 절감이 포함됩니다. `;

          if (results.roiYears.includes('회수 불가')) {
              text += `투자비용 회수는 <strong>어려울 것으로</strong> 판단됩니다.`;
          } else if (results.roiYears.includes('즉시 회수')) {
               text += `투자비용은 <strong>즉시 회수</strong>됩니다.`;
          } else {
              const yearMatch = results.roiYears.match(/([0-9.]+)/);
              if (yearMatch && yearMatch[1]) {
                  const roiYearsNumeric = parseFloat(yearMatch[1]);
                  if (roiYearsNumeric > 3) {
                      text += `투자비용 회수 기간이 <strong>${results.roiYears}</strong>으로 장기 투자로 고려해야 합니다.`;
                  } else if (roiYearsNumeric > 1.5) {
                      text += `투자비용 회수 기간은 <strong>${results.roiYears}</strong>으로 적정 수준입니다.`;
                  } else {
                      text += `투자비용 회수 기간이 <strong>${results.roiYears}</strong>으로 매우 효과적인 투자입니다.`;
                  }
              } else {
                  text += `투자비용 회수 기간은 <strong>${results.roiYears}</strong>입니다.`;
              }
          }
      }
      return text;
  };

  // --- Dynamic Summary Text ---
    const getSummaryCostReductionPercent = () => {
        if (!results || results.currentTotalCostY1 <= 0) return '계산 불가';
        const reductionPercent = (results.annualSavingY1 / results.currentTotalCostY1) * 100;
        return reductionPercent.toFixed(1);
    };

    const getSummaryMonths = () => {
        if (!results) return '계산 불가';
        if (results.roiYears.includes('회수 불가')) return '회수 불가';
        if (results.roiYears.includes('즉시 회수')) return '즉시';
        const yearMatch = results.roiYears.match(/([0-9.]+)\s*년/);
        if (yearMatch && yearMatch[1]) {
            const years = parseFloat(yearMatch[1]);
            return (years * 12).toFixed(1);
        }
        return '계산 불가';
    };

  return (
    <div className="container">
      <Head>
        <title>AI 품질검사 ROI 분석기 (표준 모델)</title>
        <meta name="description" content="표준화된 제조업 모델을 기반으로 AI 도입 경제성을 분석합니다." />
        <link rel="icon" href="/favicon.ico" /> {/* Optional: Add a favicon */}
      </Head>

      <header className="text-center mb-4">
        <h2>AI 품질검사 ROI 분석기 (표준 모델)</h2>
        <p className="lead">표준화된 제조업 모델을 기반으로 AI 도입 경제성을 분석합니다.</p>
        <p className="text-muted">아래 항목을 입력하고 분석하기 버튼을 누르세요. (기본값 제공)</p>
      </header>

      {/* --- Form View --- */}
      {view === 'form' && (
        <form id="roiForm" className="mb-5" onSubmit={(e) => { e.preventDefault(); handleCalculate(); }}>
          <h4 className="mb-3">1. 기업 기본 정보</h4>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="annualRevenue" className="form-label">연 매출액</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  id="annualRevenue"
                  value={annualRevenueEok}
                  onChange={handleNumericInputChange(setAnnualRevenueEok)}
                  inputMode="numeric" // Helps mobile keyboards
                />
                <span className="input-group-text">억원</span>
              </div>
              <div className="form-text">품질 관련 비용 추정을 위한 기준 매출액 (단위: 억원). (기본값: {DEFAULT_ANNUAL_REVENUE_Eok}억원)</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="personnelCountInput" className="form-label">현재 검사 인력 수</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  id="personnelCountInput"
                   value={personnelCount}
                   onChange={handleNumericInputChange(setPersonnelCount)}
                   inputMode="numeric"
                />
                <span className="input-group-text">명</span>
              </div>
              <div className="form-text">현재 육안 검사 인력 수.</div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="salaryInput" className="form-label">평균 연봉</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  id="salaryInput"
                  value={salaryMil}
                  onChange={handleNumericInputChange(setSalaryMil)}
                  inputMode="numeric"
                />
                <span className="input-group-text">백만원</span>
              </div>
              <div className="form-text">검사 인력 1인당 평균 연봉 (단위: 백만원). (기본값: {DEFAULT_SALARY_Mil}백만원)</div>
            </div>
             {/* Placeholder for spacing if needed */}
             <div className="col-md-6"></div>
          </div>

          <h4 className="mb-3">2. AI 시스템 도입 규모</h4>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="equipmentUnits" className="form-label">AI 도입 장비 대수(검사 라인 수)</label>
               <input
                 type="text"
                 className="form-control"
                 id="equipmentUnits"
                 value={equipmentUnits}
                 onChange={handleNumericInputChange(setEquipmentUnits)}
                 inputMode="numeric"
               />
              <div className="form-text">도입할 AI 검사 장비 또는 시스템의 총 수량. (기본값: {DEFAULT_EQUIPMENT_UNITS}대)</div>
            </div>
            <div className="col-md-6 align-self-center">
              <div className="form-check mt-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="reuseOpticalCheckbox"
                  checked={reuseOptical}
                  onChange={(e) => setReuseOptical(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="reuseOpticalCheckbox">
                  기존 광학장비 활용 (미활용시 비용 추가)
                </label>
                <div className="form-text mt-0">체크 해제 시, 신규 광학장비 비용(4,000만원/대)이 초기 투자비에 추가됩니다.</div>
              </div>
            </div>
          </div>

          <div className="d-grid gap-2 mt-4">
            <button type="submit" className="btn btn-primary btn-lg">경제성 분석하기</button>
          </div>
        </form>
      )}

      {/* --- Results View --- */}
      {view === 'results' && results && (
        <>
          {/* --- Back Button --- */}
          <div id="backButtonContainer" className="mb-4">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleViewChange('form')}
            >
              &laquo; 다시 분석하기 (입력 수정)
            </button>
          </div>

          {/* --- Variable Sliders Section --- */}
          <div id="variableSlidersSection" className="mb-4">
             <div className="d-flex justify-content-between align-items-center mb-2">
                <h4 className="mb-0" style={{ borderBottom: 'none', marginTop: 0 }}>주요 변수 조정</h4>
                {/* Basic Toggle - Consider a state variable for collapse if more complex interaction needed */}
                <button className="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#sliderCollapse" aria-expanded="false" aria-controls="sliderCollapse">
                 보기/숨기기
                </button>
             </div>
             <p className="text-muted mb-3"><em>{'{아래 변수를 조정하여 AI 도입 효과를 다양한 시나리오에서 분석할 수 있습니다.}'}</em></p>

            <div className="collapse show" id="sliderCollapse"> {/* Start expanded */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label htmlFor="misdetectReductionSlider" className="form-label">오감지율 개선 효과 (%)</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="range"
                          className="form-range me-2"
                          id="misdetectReductionSlider"
                          min="0" max="100"
                          value={misdetectReduction}
                          onChange={(e) => setMisdetectReduction(parseInt(e.target.value))}
                          />
                        <span id="misdetectReductionValue" className="badge bg-primary">{misdetectReduction}%</span>
                      </div>
                      <datalist id="misdetectTicks"><option value={DEFAULT_MISDETECT_REDUCTION} label="기본값"></option></datalist>
                      <div className="form-text">RTM 자체 분석 결과 평균 개선율 반영</div>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="qualityDefectReductionSlider" className="form-label">품질/불량 개선 효과 (%)</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="range"
                          className="form-range me-2"
                          id="qualityDefectReductionSlider"
                          min="0" max="100"
                          value={qualityDefectReduction}
                          onChange={(e) => setQualityDefectReduction(parseInt(e.target.value))}
                          />
                        <span id="qualityDefectReductionValue" className="badge bg-primary">{qualityDefectReduction}%</span>
                      </div>
                      <datalist id="qualityTicks"><option value={DEFAULT_QUALITY_DEFECT_REDUCTION} label="기본값"></option></datalist>
                      <div className="form-text">RTM 자체 분석 결과 평균 개선율 반영</div>
                    </div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label htmlFor="targetPersonnelSlider" className="form-label">AI 도입 후 인력 수 (명)</label>
                      <div className="d-flex align-items-center">
                        <input
                          type="range"
                          className="form-range me-2"
                          id="targetPersonnelSlider"
                          min="0"
                          max={unformatNumber(personnelCount) || DEFAULT_PERSONNEL_COUNT} // Dynamic max based on input
                          value={targetPersonnel}
                          onChange={(e) => setTargetPersonnel(parseInt(e.target.value))}
                          step="1"
                        />
                        <span id="targetPersonnelValue" className="badge bg-primary">{targetPersonnel}명</span>
                      </div>
                       <datalist id="personnelTicks"><option value={DEFAULT_TARGET_PERSONNEL} label="기본값"></option></datalist>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Summary Box --- */}
          <div className="alert alert-success mb-4" id="resultBox">
            <h3 className="alert-heading">분석 결과 요약</h3>
            <p id="roiSummaryParagraph" className="alert alert-light mt-3">
                분석 결과, AI 비전 시스템 도입 시 다음과 같은 비즈니스 효과가 예상됩니다:
                <br/>1) 품질 검사 정확도 <strong>{ /* Placeholder - add specific % if available */} 개선</strong> 및 검사 속도 <strong>{ /* Placeholder */} 향상</strong>
                <br/>2) 연간 운영 비용 <strong><span id="summaryCostReductionPercent">{getSummaryCostReductionPercent()}</span>%</strong> 절감
                <br/>3) 인력 운영 효율화 및 고부가가치 업무 전환 가능
                <br/>4) 초기 투자비용 회수 기간: <strong><span id="summaryMonths">{getSummaryMonths()}</span>개월</strong>
                <br/><em>(상세 비용 분석은 아래 표를 참고하세요)</em>
            </p>
            <div className="result-item">
              <p className="mb-0"><strong>초기 투자 비용 총액:</strong></p>
              <span id="summaryInitialCost">{formatWon(results.initialInvestment)}</span>
            </div>
             <p id="summaryInitialCostSubtext" className="text-muted small mt-1 mb-0 ps-3">
                (참고: 초기 도입 비용은 제한적인 환경을 가정하여 계산되었습니다. 실제 구축 환경과 모델 난이도에 따라 변동될 수 있습니다.)
             </p>
            <div className="result-item">
              <p className="mb-0"><strong>연간 절감액 (첫해):</strong></p>
              <span id="summarySavingsY1">{formatWon(results.annualSavingY1)}</span>
            </div>
            <div className="result-item">
              <p className="mb-0"><strong>연간 절감액 (2년차 이후):</strong></p>
              <span id="summarySavingsY2plus">{formatWon(results.annualSavingY2plus)}</span>
            </div>
            <div className="result-item">
              <p className="mb-0"><strong>ROI 회수 기간:</strong></p>
              <span id="summaryRoiPeriod">{results.roiYears}</span>
            </div>
            <div className="result-item">
              <p className="mb-0"><strong>5년 총 소유 비용(TCO) 절감액:</strong> <sup><a href="#" tabIndex="0" data-bs-toggle="popover" data-bs-trigger="hover focus" title="TCO 설명" data-bs-content="TCO (Total Cost of Ownership): 5년간의 총 운영 비용 비교 (초기투자 + 운영비 + 유지보수). AI 도입 시나리오에서는 첫 해 유지보수 비용은 제외됩니다.">?</a></sup></p>
              <span id="summaryTcoSavingsAbs">{formatWon(results.tcoSaving)}</span>
            </div>
            <div className="result-item">
              <p className="mb-0"><strong>5년 총 소유 비용(TCO) 절감률:</strong> <sup><a href="#" tabIndex="0" data-bs-toggle="popover" data-bs-trigger="hover focus" title="TCO 설명" data-bs-content="TCO (Total Cost of Ownership): 5년간의 총 운영 비용 비교 (초기투자 + 운영비 + 유지보수). AI 도입 시나리오에서는 첫 해 유지보수 비용은 제외됩니다.">?</a></sup></p>
              <span id="summaryTcoSavingsPerc">{results.tcoSavingRate} %</span>
            </div>
          </div>

          {/* --- Detailed Analysis Section --- */}
          <div id="analysisSection41" style={{ marginTop: 0, marginBottom: '2rem', border: '1px solid #cfe2ff', borderRadius: '8px', padding: '20px', backgroundColor: '#f8f9fa' }}>
             <h3 style={{ borderBottom: 'none', marginTop: 0 }}>상세 비용 분석 (5년 기준)</h3>
             <p className="text-muted"><em>{'{참고: 아래 표는 입력된 정보를 바탕으로 표준 절감률 가정을 적용하여 계산된 상세 내역입니다.}'}</em></p>
             <p id="analysis" className="alert alert-info mb-4" dangerouslySetInnerHTML={{ __html: getAnalysisText() }}></p>

             {/* Chart Container */}
              <div className="mb-5" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                  <div style={{ height: '450px', width: '100%', position: 'relative' }}>
                      {chartData && chartOptions && (
                        <Bar 
                          ref={chartRef}
                          data={chartData} 
                          options={chartOptions} 
                        />
                      )}
                  </div>
              </div>


             {/* Table */}
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                    <thead className="table-light">
                        <tr>
                            <th>항목</th>
                            <th>기존 연간 비용</th>
                            <th>AI 도입 후 연간 비용</th>
                            <th>연간 절감액</th>
                            <th>증감율</th>
                            <th>비고/산정 기준</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Labor */}
                        <tr>
                            <td>검사 인력 운영비</td>
                            <td>{formatWon(results.laborCost)}</td>
                            <td>{formatWon(results.reducedLabor)}</td>
                            <td>{formatWon(results.laborCost - results.reducedLabor)}</td>
                            <td className={calculatePercentageChange(results.laborCost, results.reducedLabor).className}>{calculatePercentageChange(results.laborCost, results.reducedLabor).text}</td>
                            <td>{results.remarks.labor}</td>
                        </tr>
                        {/* Training */}
                        <tr>
                            <td>교육 및 관리 비용</td>
                            <td>{formatWon(results.trainingCost)}</td>
                            <td>{formatWon(results.aiTrainingCost)}</td>
                            <td>{formatWon(results.trainingCost - results.aiTrainingCost)}</td>
                            <td className={calculatePercentageChange(results.trainingCost, results.aiTrainingCost).className}>{calculatePercentageChange(results.trainingCost, results.aiTrainingCost).text}</td>
                            <td>{results.remarks.training}</td>
                        </tr>
                        {/* Misdetection */}
                        <tr>
                            <td>과검출 비용 (매출의 {results.misdetectRate * 100}%)</td>
                            <td>{formatWon(results.misdetectCost)}</td>
                            <td>{formatWon(results.reducedMisdetect)}</td>
                            <td>{formatWon(results.misdetectCost - results.reducedMisdetect)}</td>
                            <td className={calculatePercentageChange(results.misdetectCost, results.reducedMisdetect).className}>{calculatePercentageChange(results.misdetectCost, results.reducedMisdetect).text}</td>
                            <td>{results.remarks.misdetect}</td>
                        </tr>
                        {/* Quality/Defect */}
                        <tr>
                            <td>품질관리/불량처리 비용 (매출의 {results.qualityDefectRate * 100}%)</td>
                            <td>{formatWon(results.qualityCost + results.defectCost)}</td>
                            <td>{formatWon(results.reducedQualityDefectCost)}</td>
                            <td>{formatWon((results.qualityCost + results.defectCost) - results.reducedQualityDefectCost)}</td>
                            <td className={calculatePercentageChange(results.qualityCost + results.defectCost, results.reducedQualityDefectCost).className}>{calculatePercentageChange(results.qualityCost + results.defectCost, results.reducedQualityDefectCost).text}</td>
                             <td>{results.remarks.quality}</td>
                        </tr>
                        {/* Op Subtotal */}
                        <tr className="table-group-divider">
                            <td><strong>운영 비용 소계 (첫해 기준)</strong></td>
                            <td><strong>{formatWon(results.currentTotalOpCost)}</strong></td>
                            <td><strong>{formatWon(results.aiTotalAnnualCostY1)}</strong></td>
                            <td><strong>{formatWon(results.annualSavingY1)}</strong></td>
                             <td className={calculatePercentageChange(results.currentTotalOpCost, results.aiTotalAnnualCostY1).className}>{calculatePercentageChange(results.currentTotalOpCost, results.aiTotalAnnualCostY1).text}</td>
                            <td></td>
                        </tr>
                         {/* Maintenance */}
                        <tr>
                            <td>연간 유지보수 비용 (2년차 부터)</td>
                            <td>{formatWon(results.currentMaintenance)}</td>
                            <td>{formatWon(results.aiMaintenance)}</td>
                            <td>{formatWon(results.currentMaintenance - results.aiMaintenance)}</td>
                            <td>N/A</td>
                            <td>{results.remarks.maintenance}</td>
                        </tr>
                         {/* Total Y1 */}
                        <tr className="table-info">
                            <td><strong>총 연간 비용 (첫해)</strong></td>
                            <td><strong>{formatWon(results.currentTotalCostY1)}</strong></td>
                            <td><strong>{formatWon(results.aiTotalAnnualCostY1)}</strong></td>
                            <td><strong>{formatWon(results.annualSavingY1)}</strong></td>
                            <td className={calculatePercentageChange(results.currentTotalCostY1, results.aiTotalAnnualCostY1).className}>{calculatePercentageChange(results.currentTotalCostY1, results.aiTotalAnnualCostY1).text}</td>
                            <td></td>
                        </tr>
                        {/* Total Y2+ */}
                        <tr className="table-info">
                            <td><strong>총 연간 비용 (2년차+)</strong></td>
                            <td><strong>{formatWon(results.currentTotalCostY2plus)}</strong></td>
                            <td><strong>{formatWon(results.aiTotalAnnualCostY2plus)}</strong></td>
                             <td><strong>{formatWon(results.annualSavingY2plus)}</strong></td>
                             <td className={calculatePercentageChange(results.currentTotalCostY2plus, results.aiTotalAnnualCostY2plus).className}>{calculatePercentageChange(results.currentTotalCostY2plus, results.aiTotalAnnualCostY2plus).text}</td>
                             <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 