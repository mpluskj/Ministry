import { PDFDocument, rgb, StandardFonts, PDFTextField, PDFName, PDFDict, PDFArray, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

interface Coordinate {
    x: number;
    y: number;
    label: string;
}

const SERVICE_YEAR_MONTH_ORDER = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];

let cachedTemplate: Uint8Array | null = null;
let cachedFontBytes: Uint8Array | null = null;
let cachedCoordinates: Record<string, Coordinate> | null = null;

export async function generatePublisherCard(
    yearlyData: any,
    serviceYear: string,
): Promise<Uint8Array> {
    console.log('yearlyData:', yearlyData);
    console.log('serviceYear:', serviceYear);
    try {
        let templateBytes: Uint8Array;
        let fontBytes: Uint8Array;
        let coordinates: any;

        if (!cachedTemplate || !cachedFontBytes || !cachedCoordinates) {
            const [templateResponse, fontResponse, coordResponse] = await Promise.all([
                fetch(`${import.meta.env.BASE_URL}S-21_KO.pdf`),
                fetch(`${import.meta.env.BASE_URL}GowunDodum-Regular.ttf`),
                fetch(`${import.meta.env.BASE_URL}pdf-coordinates.json`)
            ]);

            templateBytes = new Uint8Array(await templateResponse.arrayBuffer());
            fontBytes = new Uint8Array(await fontResponse.arrayBuffer());
            coordinates = await coordResponse.json();

            cachedTemplate = templateBytes;
            cachedFontBytes = fontBytes;
            cachedCoordinates = coordinates;
        } else {
            templateBytes = cachedTemplate;
            fontBytes = cachedFontBytes;
            coordinates = cachedCoordinates;
        }

        const pdfDoc = await PDFDocument.load(templateBytes);

        pdfDoc.registerFontkit(fontkit);

        // Remove subset: true to prevent missing characters for dynamic text
        const font = await pdfDoc.embedFont(fontBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        const form = pdfDoc.getForm();

        // Delete XFA to fallback to AcroForm if available
        form.deleteXFA();

        // Debug: Log all form fields
        const fields = form.getFields();
        // 필드 정보 디버그 출력 제거

        // Use existing form fields instead of creating new ones

        // --- 모든 필드 값 입력 및 appearance 업데이트 이후에 폼필드 제거 ---
        
        const userInfo = yearlyData.userInfo || {};
        
        // Static user text fields
        const userTextFields = ['name', 'birthDate', 'baptismDate'];
        userTextFields.forEach(key => {
            const config = coordinates[key];
            if (!config) {
                console.warn(`Missing coordinate config for key: ${key}`, coordinates);
                return;
            }
            const fieldName = config.fieldName; // Use the Korean name from coordinates or map it
            // Map English keys to Korean field names
            let koreanName = '';
            switch(key) {
                case 'name': koreanName = '성명'; break;
                case 'birthDate': koreanName = '생년월일'; break;
                case 'baptismDate': koreanName = '침례 일자'; break;
            }
            try {
                if (!koreanName) return;
                const field = form.getTextField(koreanName);
                field.setText(userInfo[key] ?? '');
                field.setFontSize(12); // Adjust font size to prevent clipping
                field.setAlignment(0); // Left alignment
                field.updateAppearances(font);
            } catch (e) {
                console.warn(`Field not found: ${koreanName}`);
            }
        });
        
        // Static user checkbox fields
        const userCheckboxFields = ['maleCheckbox', 'femaleCheckbox', 'hopeCheckbox', 'anointedCheckbox', 'elderCheckbox', 'msCheckbox', 'rpCheckbox', 'spCheckbox', 'missionaryCheckbox'];
        const checkboxConditions: { [key: string]: boolean } = {
            maleCheckbox: userInfo.gender === '남',
            femaleCheckbox: userInfo.gender === '여',
            hopeCheckbox: userInfo.hope === "다른 양",
            anointedCheckbox: userInfo.hope === "기름부음받은 자",
            elderCheckbox: !!userInfo.isElder,
            msCheckbox: !!userInfo.isMinisterialServant,
            rpCheckbox: !!userInfo.isRegularPioneer,
            spCheckbox: !!userInfo.isSpecialPioneer,
            missionaryCheckbox: !!userInfo.isMissionary,
        };
        const checkboxKoreanNames: { [key: string]: string } = {
            maleCheckbox: '남',
            femaleCheckbox: '여',
            hopeCheckbox: '다른 양',
            anointedCheckbox: '기름부음받은 자',
            elderCheckbox: '장로',
            msCheckbox: '봉사의 종',
            rpCheckbox: '정규 파이오니아',
            spCheckbox: '특별 파이오니아',
            missionaryCheckbox: '야외 선교인',
        };
        userCheckboxFields.forEach(key => {
            const koreanName = checkboxKoreanNames[key];
            const field = form.getCheckBox(koreanName);
            if (checkboxConditions[key]) field.check();
            else field.uncheck();
        });
        
        // Monthly table
        const monthlyRecords = yearlyData.monthlyRecords || [];
        const tableColumns = ['tableParticipatedX', 'tableStudiesX', 'tableAPX', 'tableHoursX', 'tableRemarksX'];
        let totalHours = 0;
        let totalRemarks = 0;
        
        SERVICE_YEAR_MONTH_ORDER.forEach((month, index) => {
            const record = monthlyRecords.find((r: any) => r.month === month) || {};
            
            // Accumulate hours
            if (record.hours && typeof record.hours === 'number') {
                totalHours += record.hours;
            }

            // Accumulate numbers in remarks
            if (record.remarks) {
                // 숫자와 쉼표를 포함한 패턴 매칭 (예: 1,000)
                const matches = String(record.remarks).match(/-?[\d,]+(\.\d+)?/g);
                if (matches) {
                    matches.forEach(m => {
                        // 쉼표 제거 후 숫자로 변환
                        const val = parseFloat(m.replace(/,/g, ''));
                        if (!isNaN(val)) {
                            totalRemarks += val;
                        }
                    });
                }
            }

            tableColumns.forEach(colKey => {
                const config = coordinates[colKey];
                if (!config) {
                     console.warn(`Missing coordinate config for key: ${colKey}`);
                     return;
                }
                let fieldName = '';
                let value: string | boolean = '';
                let isCheckbox = false;
                switch (config.fieldName) {
                    case 'participated':
                        fieldName = `${month} 봉사에 참여했음`;
                        isCheckbox = true;
                        value = !!record.participated;
                        break;
                    case 'studies':
                        fieldName = `${month} 성서 연구`;
                        value = (record.bibleStudies ?? 0) > 0 ? String(record.bibleStudies) : '';
                        break;
                    case 'ap':
                        fieldName = `${month} 보조 파이오니아`;
                        isCheckbox = true;
                        value = record.division === 'AP';
                        break;
                    case 'hours':
                        fieldName = `${month} 시간`;
                        value = (record.hours ?? 0) > 0 ? String(record.hours) : '';
                        break;
                    case 'remarks':
                        fieldName = `${month} 비고`;
                        value = record.remarks ?? '';
                        break;
                }
                if (isCheckbox) {
                    if (!fieldName) return;
                    const field = form.getCheckBox(fieldName);
                    if (value) field.check();
                    else field.uncheck();
                } else {
                    if (!fieldName) return;
                    const field = form.getTextField(fieldName);
                    field.setText(String(value));
                    if (config.multiline) field.enableMultiline();
                    
                    // 폰트 크기 및 정렬 설정
                    let fontSize = 11;
                    let alignment = 1; // Center
                    let yShift = 3; // 기본적으로 모든 텍스트 필드를 3포인트 상향 조정 (성서 연구, 시간 등)

                    // 비고란은 왼쪽 정렬, 나머지는 가운데 정렬
                    if (config.fieldName === 'remarks') {
                        alignment = 0; // Left
                        fontSize = 9; // 비고는 글자가 많을 수 있으므로 조금 작게
                        yShift = 4; // 비고란은 조금 더 상향 조정
                    }

                    field.setFontSize(fontSize);
                    field.setAlignment(alignment);
                    
                    // 위치 조정 (모든 텍스트 필드에 적용)
                    try {
                        const widgets = field.acroField.getWidgets();
                        widgets.forEach(widget => {
                            const rect = widget.getRectangle();
                            widget.setRectangle({
                                x: rect.x,
                                y: rect.y + yShift,
                                width: rect.width,
                                height: rect.height
                            });
                        });
                    } catch (e) {
                        console.warn('Failed to adjust field position:', e);
                    }
                    
                    field.updateAppearances(font);
                }
            });
        });

        // Set total hours
        const totalHoursField = form.getTextField('총계 시간');
        totalHoursField.setText(totalHours > 0 ? String(totalHours) : '');
        totalHoursField.setFontSize(11);
        totalHoursField.setAlignment(1);
        
        // Adjust total hours position
        try {
            const widgets = totalHoursField.acroField.getWidgets();
            widgets.forEach(widget => {
                const rect = widget.getRectangle();
                widget.setRectangle({
                    x: rect.x,
                    y: rect.y + 3, // +3 point shift
                    width: rect.width,
                    height: rect.height
                });
            });
        } catch (e) {
            console.warn('Failed to adjust total hours field position:', e);
        }
        
        totalHoursField.updateAppearances(font);

        // Set total remarks
        try {
            const totalRemarksField = form.getTextField('총계 비고');
            totalRemarksField.setText(totalRemarks > 0 ? String(totalRemarks) : '');
            totalRemarksField.setFontSize(11);
            totalRemarksField.setAlignment(1);

            // Adjust total remarks position
            const widgets = totalRemarksField.acroField.getWidgets();
            widgets.forEach(widget => {
                const rect = widget.getRectangle();
                widget.setRectangle({
                    x: rect.x,
                    y: rect.y + 3, // +3 point shift
                    width: rect.width,
                    height: rect.height
                });
            });
            
            totalRemarksField.updateAppearances(font);
        } catch (e) {
            console.warn('Total remarks field not found or failed to update:', e);
        }
        
        // Set service year
        const serviceYearField = form.getTextField('봉사 연도');
        serviceYearField.setText(serviceYear);
        serviceYearField.setFontSize(11);
        serviceYearField.setAlignment(1);
        serviceYearField.updateAppearances(font);
        
        // Update appearances with custom font
        form.updateFieldAppearances(font);

         // Iterate over all fields to ensure font size is applied globally
         const allFields = form.getFields();
         allFields.forEach(field => {
             if (field instanceof PDFTextField) {
                 const fieldName = field.getName();
                 
                 // 기본 설정
                 let fontSize = 11;
                 let alignment = 1; // Center
                 
                 // 필드별 예외 처리
                 if (fieldName === '성명' || fieldName === '생년월일' || fieldName === '침례 일자') {
                     alignment = 0; // Left
                 } else if (fieldName.endsWith(' 비고')) {
                     alignment = 0; // Left
                     fontSize = 9; // 비고는 작게
                 }

                 field.setFontSize(fontSize);
                 field.setAlignment(alignment);
                 field.updateAppearances(font);
             }
         });

         // JavaScript for calculating total
         const hourFieldNames = [
             '9월 시간', '10월 시간', '11월 시간', '12월 시간',
             '1월 시간', '2월 시간', '3월 시간', '4월 시간',
             '5월 시간', '6월 시간', '7월 시간', '8월 시간'
         ];

         // Helper to escape unicode for JS string
         const escapeUnicode = (str: string) => {
             return str.split('').map(c => {
                 const hex = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
                 return '\\u' + hex;
             }).join('');
         };
         
         // Robust calculation script adapted from S-21 with full Unicode escape

          const escapedFieldNames = hourFieldNames.map(n => `"${escapeUnicode(n)}"`).join(', ');

          const calculationScript = PDFString.of(`
// Script S-21 Adapted for new field names
// Created: 9/29/2021 (Original) / Adapted

var total = Number(0);
var fNames = [${escapedFieldNames}];

for (var i = 0; i < fNames.length; i++) {
    var fieldName = fNames[i];
    var field = this.getField(fieldName);
    if (field) {
        var monthVal = field.value;
        if (monthVal !== "") {
             total = Number(total) + Number(monthVal);
        }
    }
}

if (total == 0) {
    event.value = "";
} else {
    event.value = total;
}
`);

         try {
             const totalField = form.getTextField('총계 시간');
             
             // 1. Set the Calculate (C) action on the Field dictionary (AA entry)
             const totalFieldDict = totalField.acroField.dict;
             
             // Create Action Dictionary
             const actionDict = pdfDoc.context.obj({
                 S: 'JavaScript',
                 JS: calculationScript
             });

             // Get or Create AA Dictionary on the Field
             let aaDict = totalFieldDict.get(PDFName.of('AA'));
             if (!aaDict) {
                 aaDict = pdfDoc.context.obj({});
                 totalFieldDict.set(PDFName.of('AA'), aaDict);
             }
             
             if (aaDict instanceof PDFDict) {
                 aaDict.set(PDFName.of('C'), actionDict);
             }

             // 2. Add 'Validate' action to all hour fields to force recalculation
             // This ensures that when an hour field changes, the calculation chain is triggered.
             const triggerScript = '/* trigger calc */'; 
             
             hourFieldNames.forEach(fieldName => {
                 try {
                     const field = form.getTextField(fieldName);
                     // Attach to Field dictionary, not just widget
                     const fieldDict = field.acroField.dict;
                     
                     let fAaDict = fieldDict.get(PDFName.of('AA'));
                     if (!fAaDict) {
                         fAaDict = pdfDoc.context.obj({});
                         fieldDict.set(PDFName.of('AA'), fAaDict);
                     }
                     
                     if (fAaDict instanceof PDFDict) {
                         // Add a simple Validate action if not present
                         // This helps notify the viewer that data changed
                         if (!fAaDict.has(PDFName.of('V'))) {
                             fAaDict.set(PDFName.of('V'), pdfDoc.context.obj({
                                 S: 'JavaScript',
                                 JS: triggerScript
                             }));
                         }
                         // Also 'F' (Format) or 'K' (Keystroke) can be used, but V is safer.
                     }
                 } catch (e) {
                     // ignore
                 }
             });

             // 3. Ensure "Total" field is in the Calculation Order (CO) of the AcroForm
              const catalog = pdfDoc.catalog;
              const acroForm = catalog.get(PDFName.of('AcroForm'));
              if (acroForm instanceof PDFDict) {
                  // Use lookup to resolve reference if CO exists
                  let coArray = acroForm.lookup(PDFName.of('CO'));
                  
                  if (!coArray || !(coArray instanceof PDFArray)) {
                      // Create new CO array if missing or invalid
                      coArray = pdfDoc.context.obj([]);
                      const coRef = pdfDoc.context.register(coArray);
                      acroForm.set(PDFName.of('CO'), coRef);
                  }
                  
                  // Now coArray is definitely a PDFArray
                  if (coArray instanceof PDFArray) {
                      coArray.push(totalField.ref);
                  }
              }

          } catch (e) {
              console.error('Failed to add calculation script:', e);
          }

        
        // 모든 데이터 입력 및 appearance 업데이트 후 폼필드 제거
        form.flatten();
        // Save and return PDF bytes
        return await pdfDoc.save();
    } catch (error) {
        console.error('S-21 PDF 생성 오류:', error);
        throw error;
    }
}

export async function mergePDFs(pdfBytesArray: Uint8Array[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBytes of pdfBytesArray) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
}