document.addEventListener('DOMContentLoaded', () => {

    // ---------------------------------------------------
    // --- 題庫資料已移至 questions.js ---
    // ---------------------------------------------------

    // 全域變數
    let allQuestions = [];
    let currentQuestions = [];
    let currentIndex = 0;
    let currentMode = '';
    let userAnswers = {}; // 用來記憶答題狀態 (session-based)
    let originalHeaderText = ''; 

    // DOM 元素
    const rootHtml = document.documentElement; // 【新增】
    const modeSelector = document.getElementById('mode-selector');
    const quizContainer = document.getElementById('quiz-container');
    const scoreScreen = document.getElementById('score-screen');
    const bottomNav = document.getElementById('bottom-nav');
    
    const headerTitle = document.getElementById('header-title'); 
    
    // 【新增】字型縮放按鈕
    const fontIncreaseBtn = document.getElementById('font-increase');
    const fontDecreaseBtn = document.getElementById('font-decrease');
    
    const btnAll = document.getElementById('btn-all');
    const btnMockExam = document.getElementById('btn-mock-exam');

    const backToModesBtn = document.getElementById('back-to-modes-btn');

    const currentQNumEl = document.getElementById('current-q-num');
    const totalQNumEl = document.getElementById('total-q-num');
    const jumpNav = document.getElementById('jump-nav');
    const jumpInput = document.getElementById('jump-to-q');
    const jumpBtn = document.getElementById('jump-btn');
    const prevQBtn = document.getElementById('prev-q');
    const nextQBtn = document.getElementById('next-q');
    
    const questionText = document.getElementById('question-text');
    const multiChoiceIndicator = document.getElementById('multi-choice-indicator');
    const optionsContainer = document.getElementById('options-container');
    const submitBtn = document.getElementById('submit-btn');

    const feedback = document.getElementById('feedback');
    const feedbackResult = document.getElementById('feedback-result');
    const correctAnswerEl = document.getElementById('correct-answer');
    const explanationText = document.getElementById('explanation-text');

    const darkModeSwitch = document.getElementById('dark-mode-switch');
    
    const scoreValueEl = document.getElementById('score-value');
    const scoreDetailsEl = document.getElementById('score-details');
    const btnRetryExam = document.getElementById('btn-retry-exam');
    const btnBackToMenu = document.getElementById('btn-back-to-menu');


    // 初始化
    function init() {
        if (typeof ALL_QUESTIONS_DATA === 'undefined' || ALL_QUESTIONS_DATA.length === 0) {
            alert('錯誤：讀取題庫失敗！請確認 questions.js 檔案已正確載入，且內容不為空。');
            return;
        }
        allQuestions = ALL_QUESTIONS_DATA;
        
        if (headerTitle) {
            originalHeaderText = headerTitle.textContent;
        }
        
        setupEventListeners();
        loadPreferences();
    }

    // 2. 設置事件監聽
    function setupEventListeners() {
        btnAll.addEventListener('click', () => startQuiz('all'));
        btnMockExam.addEventListener('click', () => startQuiz('mock', 50)); 

        backToModesBtn.addEventListener('click', goBackToModes);

        prevQBtn.addEventListener('click', () => changeQuestion(-1));
        
        submitBtn.addEventListener('click', checkAnswer);
        
        jumpBtn.addEventListener('click', jumpToQuestion);
        jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') jumpToQuestion();
        });

        darkModeSwitch.addEventListener('change', toggleDarkMode);
        
        btnRetryExam.addEventListener('click', () => {
            scoreScreen.classList.add('hidden');
            startQuiz('mock', 50);
        });
        
        btnBackToMenu.addEventListener('click', () => {
            scoreScreen.classList.add('hidden');
            modeSelector.classList.remove('hidden');
            headerTitle.textContent = originalHeaderText;
        });

        // 【新增】字型縮放按鈕監聽
        fontIncreaseBtn.addEventListener('click', increaseFontSize);
        fontDecreaseBtn.addEventListener('click', decreaseFontSize);
    }
    
    // 返回模式選擇
    function goBackToModes() {
        let confirmMessage = '';
        
        if (currentMode === 'all') {
            confirmMessage = '您確定要返回模式選擇嗎？您目前的進度已儲存。';
        } else if (currentMode === 'mock') {
            confirmMessage = '您確定要提早結束測驗嗎？系統將會立即結算您目前的成績。';
        }

        if (confirm(confirmMessage)) {
            if (currentMode === 'mock') {
                calculateAndShowScore();
            } else {
                quizContainer.classList.add('hidden');
                bottomNav.classList.add('hidden');
                modeSelector.classList.remove('hidden');
                headerTitle.textContent = originalHeaderText;
            }
            currentQuestions = [];
            userAnswers = {};
            hideFeedback();
        }
    }


    // 3. 載入使用者偏好 (深色模式, 進度)
    function loadPreferences() {
        // 深色模式
        const isDark = localStorage.getItem('darkMode') === 'true';
        darkModeSwitch.checked = isDark;
        if (isDark) {
            document.body.classList.add('dark-mode');
        }
        
        // 進度
        const lastIndex = parseInt(localStorage.getItem('clf-c02-lastIndex') || '0', 10);
        currentIndex = lastIndex;

        // 【新增】載入字型大小
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            rootHtml.style.fontSize = savedFontSize + 'px';
        }
    }

    // 4. 開始測驗
    function startQuiz(mode, count = 0) {
        currentMode = mode;
        userAnswers = {}; 
        modeSelector.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        scoreScreen.classList.add('hidden'); 

        if (mode === 'all') {
            headerTitle.textContent = '全部瀏覽模式';
            currentQuestions = allQuestions;
            const lastIndex = parseInt(localStorage.getItem('clf-c02-lastIndex') || '0', 10);
            currentIndex = (lastIndex >= 0 && lastIndex < allQuestions.length) ? lastIndex : 0;
            jumpNav.classList.remove('hidden');
        } else if (mode === 'mock') { 
            headerTitle.textContent = '模擬測驗模式';
            currentQuestions = shuffleArray([...allQuestions]).slice(0, count);
            currentIndex = 0;
            jumpNav.classList.add('hidden');
        }
        
        jumpInput.max = currentQuestions.length;
        displayQuestion(currentIndex);
    }

    // 5. 顯示題目
    function displayQuestion(index) {
        if (index < 0 || index >= currentQuestions.length) return;
        
        currentIndex = index;
        const q = currentQuestions[index];
        
        hideFeedback();
        
        questionText.textContent = `(${q.id}) ${q.zh.question}`;
        
        optionsContainer.innerHTML = '';
        submitBtn.disabled = false;
        submitBtn.textContent = '提交答案'; 

        const isMultiple = q.zh.answer.includes(',');
        const inputType = isMultiple ? 'checkbox' : 'radio';
        multiChoiceIndicator.classList.toggle('hidden', !isMultiple);
        
        submitBtn.classList.toggle('hidden', !isMultiple);

        // 產生選項
        q.zh.options.forEach(optionString => {
            const value = optionString.split('.')[0].trim();
            const text = optionString.substring(optionString.indexOf('.') + 1).trim();

            const item = document.createElement('div');
            item.className = 'option-item';

            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'option';
            input.value = value;
            input.id = `opt-${value}`;

            const prefix = document.createElement('span');
            prefix.className = 'option-prefix';
            prefix.textContent = `${value}.`;

            const label = document.createElement('label');
            label.htmlFor = `opt-${value}`;
            label.textContent = text;
            
            item.appendChild(input);
            item.appendChild(prefix);
            item.appendChild(label);
            optionsContainer.appendChild(item);
            
            if (!isMultiple) {
                item.addEventListener('click', () => {
                    if (input.disabled) return;
                    
                    input.checked = true;
                    checkAnswer();
                });
            }
        });

        updateNav();

        if (currentMode === 'all') {
            localStorage.setItem('clf-c02-lastIndex', currentIndex);
        }
        
        restoreAnswerState(q.id);
    }

    // 輔助函式：禁用所有選項
    function disableOptions() {
        const allInputs = optionsContainer.querySelectorAll('input');
        allInputs.forEach(input => {
            input.disabled = true;
            if (input.parentElement.classList.contains('option-item')) {
                input.parentElement.style.cursor = 'not-allowed';
                input.parentElement.style.opacity = '0.7';
            }
        });
    }

    // 6. 檢查答案
    function checkAnswer() {
        const q = currentQuestions[currentIndex];
        
        if (userAnswers[q.id]) return; 

        const correctAnswers = q.zh.answer.split(',').map(s => s.trim()).sort();
        
        const selectedInputs = optionsContainer.querySelectorAll('input:checked');
        const userSelection = Array.from(selectedInputs).map(input => input.value).sort();

        const isCorrect = userSelection.length === correctAnswers.length && 
                          userSelection.every((val, i) => val === correctAnswers[i]);

        userAnswers[q.id] = {
            selection: userSelection,
            correct: isCorrect
        };

        showFeedback(isCorrect, q.zh.answer, q.zh.explanation);
        
        disableOptions();
        submitBtn.disabled = true;

        if (currentMode === 'mock' && currentIndex === currentQuestions.length - 1) {
            submitBtn.textContent = '完成測驗，查看分數';
            nextQBtn.disabled = false;
            nextQBtn.textContent = '查看分數';
            nextQBtn.onclick = calculateAndShowScore;
        }
    }

    // 7. 顯示/隱藏回饋
    function showFeedback(isCorrect, answer, explanation) {
        feedback.classList.remove('hidden');
        correctAnswerEl.textContent = answer;
        explanationText.innerHTML = explanation.replace(/\n/g, '<br>');

        if (isCorrect) {
            feedbackResult.textContent = '✔️ 正確';
            feedback.className = 'feedback correct';
        } else {
            feedbackResult.textContent = '❌ 錯誤';
            feedback.className = 'feedback incorrect';
        }
    }

    function hideFeedback() {
        feedback.classList.add('hidden');
    }
    
    // 恢復答題狀態 (用於上一題/下一題)
    function restoreAnswerState(questionId) {
        if (userAnswers[questionId]) {
            const answer = userAnswers[questionId];
            
            answer.selection.forEach(val => {
                const input = document.getElementById(`opt-${val}`);
                if (input) input.checked = true;
            });
            
            const q = currentQuestions.find(q => q.id === questionId);
            showFeedback(answer.correct, q.zh.answer, q.zh.explanation);
            
            disableOptions();
            submitBtn.disabled = true;
        } else {
            submitBtn.disabled = false;
        }
    }

    // 8. 換頁邏輯
    function changeQuestion(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < currentQuestions.length) {
            displayQuestion(newIndex);
        }
    }

    function jumpToQuestion() {
        const qNum = parseInt(jumpInput.value, 10);
        if (qNum >= 1 && qNum <= currentQuestions.length) {
            displayQuestion(qNum - 1); 
        } else {
            alert(`請輸入 1 到 ${currentQuestions.length} 之間的題號`);
        }
        jumpInput.value = '';
    }

    // 9. 更新導覽列狀態
    function updateNav() {
        currentQNumEl.textContent = currentIndex + 1;
        totalQNumEl.textContent = currentQuestions.length;
        prevQBtn.disabled = (currentIndex === 0);
        
        nextQBtn.textContent = '下一題';
        nextQBtn.onclick = () => changeQuestion(1); 

        if (currentIndex === currentQuestions.length - 1) {
            nextQBtn.disabled = true;
            if (currentMode === 'mock' && userAnswers[currentQuestions[currentIndex].id]) {
                nextQBtn.disabled = false;
                nextQBtn.textContent = '查看分數';
                nextQBtn.onclick = calculateAndShowScore;
            }
        } else {
            nextQBtn.disabled = false;
        }
    }
    
    // 10. 結算分數
    function calculateAndShowScore() {
        let correctCount = 0;
        
        currentQuestions.forEach(q => {
            if (userAnswers[q.id] && userAnswers[q.id].correct) {
                correctCount++;
            }
        });

        const score = correctCount * 2; // 50 題, 每題 2 分
        const totalAnswered = Object.keys(userAnswers).length;

        scoreValueEl.textContent = `${score} / 100`;
        scoreDetailsEl.textContent = `您回答了 ${totalAnswered} / 50 題，答對了 ${correctCount} 題。`;

        quizContainer.classList.add('hidden');
        bottomNav.classList.add('hidden');
        scoreScreen.classList.remove('hidden');
        headerTitle.textContent = '測驗結果';
    }

    // 11. 切換深色模式
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    }

    // 12. 輔助工具：洗牌演算法
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- 【新增】字型縮放函式 ---
    
    // 獲取目前 <html> 的字型大小 (單位 px)
    function getCurrentFontSize() {
        const style = window.getComputedStyle(rootHtml);
        return parseFloat(style.fontSize); // 回傳 px 值
    }

    // 更新 <html> 的字型大小並儲存
    function updateFontSize(newSize) {
        // 設定上下限 (12px ~ 22px)
        if (newSize < 12) newSize = 12;
        if (newSize > 22) newSize = 22;

        rootHtml.style.fontSize = newSize + 'px';
        localStorage.setItem('fontSize', newSize);
    }

    // 放大
    function increaseFontSize() {
        let currentSize = getCurrentFontSize();
        updateFontSize(currentSize + 1);
    }

    // 縮小
    function decreaseFontSize() {
        let currentSize = getCurrentFontSize();
        updateFontSize(currentSize - 1);
    }
    
    // --- 啟動應用程式 ---
    init();
});