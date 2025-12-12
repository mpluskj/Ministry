import React, { useState } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import PDFCoordinateAdjuster from './PDFCoordinateAdjuster';

// 테스트용 샘플 데이터 - 모든 체크박스 테스트를 위해 모두 활성화
const sampleYearlyData = {
    userInfo: {
        name: '김성진',
        birthDate: '1969. 6. 8.',
        baptismDate: '2007. 7. 28.',
        gender: '여', // 여성으로 설정하여 여 체크박스 테스트
        hope: '다른 양',
        isElder: true, // 모든 직책 체크박스 테스트를 위해 활성화
        isMinisterialServant: true,
        isRegularPioneer: true,
        isSpecialPioneer: true,
        isMissionary: true
    },
    monthlyRecords: [
        { month: '9월', participated: true, bibleStudies: 2, hours: 53, division: 'RP', remarks: '테스트' },
        { month: '10월', participated: true, bibleStudies: 1, hours: 51, division: 'AP', remarks: '' }, // AP 테스트
        { month: '11월', participated: true, bibleStudies: 3, hours: 43, division: 'RP', remarks: '' },
        { month: '12월', participated: true, bibleStudies: 0, hours: 0, division: 'AP', remarks: '' }, // AP 테스트
        { month: '1월', participated: true, bibleStudies: 1, hours: 45, division: 'RP', remarks: '' },
        { month: '2월', participated: true, bibleStudies: 2, hours: 50, division: 'RP', remarks: '' },
        { month: '3월', participated: true, bibleStudies: 0, hours: 48, division: 'RP', remarks: '' },
        { month: '4월', participated: true, bibleStudies: 1, hours: 52, division: 'RP', remarks: '' },
        { month: '5월', participated: true, bibleStudies: 0, hours: 49, division: 'RP', remarks: '' },
        { month: '6월', participated: true, bibleStudies: 2, hours: 51, division: 'RP', remarks: '' },
        { month: '7월', participated: true, bibleStudies: 1, hours: 47, division: 'RP', remarks: '' },
        { month: '8월', participated: true, bibleStudies: 0, hours: 50, division: 'RP', remarks: '' },
    ]
};

export default function PDFCoordinateTest() {
    const [adjusterOpen, setAdjusterOpen] = useState(false);

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                PDF 좌표 조정 도구 테스트
            </Typography>

            <Box sx={{ mt: 3 }}>
                <Typography variant="body1" paragraph>
                    이 도구를 사용하여 S-21_KO.pdf 템플릿의 좌표를 조정할 수 있습니다.
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>사용 방법:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div">
                    <ol>
                        <li>아래 버튼을 클릭하여 좌표 조정 도구를 엽니다</li>
                        <li>왼쪽 패널에서 조정할 필드를 선택합니다</li>
                        <li>슬라이더 또는 텍스트 입력으로 X, Y 좌표를 조정합니다</li>
                        <li>"미리보기 새로고침" 버튼을 클릭하여 변경사항을 확인합니다</li>
                        <li>만족스러우면 "좌표 내보내기" 버튼으로 JSON 파일을 저장합니다</li>
                    </ol>
                </Typography>

                <Typography variant="body2" color="warning.main" paragraph>
                    <strong>주의:</strong> 자동 새로고침이 비활성화되어 있습니다.
                    좌표 변경 후 "미리보기 새로고침" 버튼을 클릭해야 PDF가 업데이트됩니다.
                </Typography>

                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => setAdjusterOpen(true)}
                    sx={{ mt: 2 }}
                >
                    좌표 조정 도구 열기
                </Button>
            </Box>

            <PDFCoordinateAdjuster
                open={adjusterOpen}
                onClose={() => setAdjusterOpen(false)}
            />
        </Container>
    );
}
