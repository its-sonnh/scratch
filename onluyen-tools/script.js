document.addEventListener('DOMContentLoaded', () => {
    // View Switching
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            navBtns.forEach(b => b.classList.remove('active'));
            viewSections.forEach(v => v.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // File Upload Logic for View 1
    const fileSysInput = document.getElementById('file-sys');
    const dropSys = document.getElementById('drop-sys');
    const fileOrigInput = document.getElementById('file-orig');
    const dropOrig = document.getElementById('drop-orig');
    const btnProcess = document.getElementById('btn-process-qa');

    let sysFile = null;
    let origFile = null;
    let docxPdfFile = null;

    function checkFiles() {
        if (sysFile && origFile) {
            btnProcess.disabled = false;
        } else {
            btnProcess.disabled = true;
        }
    }

    function setupDragAndDrop(dropArea, fileInput, type) {
        // Click to upload
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0], dropArea, type);
            }
        });

        // Drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            }, false);
        });

        dropArea.addEventListener('drop', (e) => {
            let dt = e.dataTransfer;
            let files = dt.files;
            if (files.length > 0) {
                handleFile(files[0], dropArea, type);
            }
        }, false);
    }

    function handleFile(file, dropArea, type) {
        if (file.type !== 'application/pdf') {
            alert('Chỉ chấp nhận file PDF!');
            return;
        }

        if (type === 'sys') {
            sysFile = file;
        } else if (type === 'orig') {
            origFile = file;
        } else if (type === 'docx') {
            docxPdfFile = file;
            dropArea.classList.add('has-file');
            const textElem = dropArea.querySelector('.upload-text');
            textElem.textContent = file.name;
            return;
        }

        dropArea.classList.add('has-file');
        const textElem = dropArea.querySelector('.upload-text');
        textElem.textContent = file.name;

        checkFiles();
    }

    setupDragAndDrop(dropSys, fileSysInput, 'sys');
    setupDragAndDrop(dropOrig, fileOrigInput, 'orig');

    // --- CẤU HÌNH GEMINI API CHO TÍNH NĂNG KIỂM TRA (VIEW 1) ---
    const qaApiKeyInput = document.getElementById('qa-gemini-api-key');

    // Load saved settings for QA View from localStorage
    if (localStorage.getItem('qa_gemini_api_key')) {
        qaApiKeyInput.value = localStorage.getItem('qa_gemini_api_key');
    }

    // Save settings to localStorage on input
    qaApiKeyInput.addEventListener('input', (e) => localStorage.setItem('qa_gemini_api_key', e.target.value));

    const QA_SYSTEM_PROMPT = `Tôi là 1 người cấu hình đề kiểm tra các môn lên hệ thống của tôi. Bạn sẽ giúp tôi kiểm tra lỗi, cụ thể như sau:
Tôi sẽ gửi bạn 2 file, 1 file là PDF UI hệ thống của tôi, nó sẽ là cái mà học sinh sẽ nhìn thấy và làm, bên trong có đáp án của câu hỏi. 1 file là file gốc của trường gửi.
Một số điều bạn cần lưu ý về UI hệ thống 
1 Phần trắc nghiệm: các câu trả lời sẽ được đảo so với đề gốc, và cả thứ tự. vậy nên, đây là 1 tính năng và không sai.
2 phần đúng sai: 1 câu đúng sai có đáp án đúng và sai, trong đó đáp án đúng được thiết lập của hệ thống sẽ có ô màu cam chữ trắng, ngược lại với màu xanh nhạt chữ xanh đậm
3 phần điền: đáp án phần điền sẽ nằm ở trong hộp điền bên cạnh từ " đáp án"
Bạn sẽ kiểm tra các nội dung sau.Bên cạnh đó, hệ thống của tôi có chức năng trộn câu hỏi sẵn và trộn đáp án, tuy nhiên vẫn giữ nguyên cấu phần 3 phần hoặc 2 tùy vào đề, nên nếu có sự tráo đổi câu hỏi, mà vẫn đúng về mặt nội dung, thì nó vẫn đúng
Về nội dung
1. Câu hỏi: câu hỏi đã đúng so với đề chưa, câu hỏi có bị thiếu nội dung quan trọng so với đề không, câu hỏi có bị thiếu hình không.
2. Câu trả lời: Câu trả lời có đủ so với câu trả lời trong đề không, nội dung có đúng so với trong đề không, đáp án đúng có khớp không.
Các lỗi thường gặp
- Câu hỏi bị cụt, thiếu vế (câu hỏi không hoàn chỉnh về mặt ngữ nghĩa)
- Dữ liệu trong đề mâu thuẫn nhau (ví dụ: đề cho x = 5 nhưng phương án tính với x = 3)
- Câu hỏi có nhiều hơn một đáp án đúng (với đề trắc nghiệm một đáp án)
- Câu hỏi không có đáp án đúng nào trong các phương án
- Hình ảnh/bảng số liệu được đề cập nhưng bị thiếu trong đề
Về hình thức:
Câu hỏi/câu trả lời/hình thức chung: Có các vấn đề về hình thức không? Ký hiệu toán sai, dính chữ liền chữ,...
Các lỗi chính tả thường gặp: 
- Lỗi viết sai chữ (ví dụ: "lãm" thay vì "làm", "coong thức" thay vì "công thức")
- Lỗi dấu câu: thiếu dấu chấm, dấu phẩy đặt sai chỗ, dùng dấu chấm thay dấu phẩy
- Lỗi viết hoa/viết thường không nhất quán
- Lỗi từ bị lặp liền nhau (ví dụ: "tính tính giá trị")
- Từ bị thiếu hoặc thừa trong câu
Lỗi công thức và kí hiệu toán học thường gặp
- Công thức bị vỡ định dạng, hiển thị sai (ví dụ: "x2" thay vì "x²", "căn(x" thiếu đóng ngoặc)
- Ký hiệu toán học không chuẩn (dùng * thay vì ×, dùng / thay vì ÷ không nhất quán)
- Đơn vị đo lường bị thiếu hoặc sai (ví dụ: "5 m/s²" viết thành "5 m/s2")
- Ngoặc mở mà không đóng, hoặc đóng mà không mở
Ngoài ra bạn hãy check các bất thường về câu hỏi khác mà bạn nghi ngờ.
- Lỗi phương án trả lời bị gộp vào nội dung câu hỏi: Các đáp án (A, B, C, D) bị dính liền vào phần văn bản của câu hỏi thay vì được tách thành các lựa chọn độc lập. Dấu hiệu nhận biết trên UI: Các phương án này không có ô chấm tròn (radio button) ở đằng trước để học sinh có thể tích chọn.
Bên cạnh đó bạn hãy kiểm tra thêm nội dung của nhà trường, về mặt học thuật đã đúng và đầy đủ chưa
Bạn hãy trả tôi kết quả như sau
Nếu không có lỗi, bạn hãy trả ra "đề nhập lên không có lỗi"
Nếu có lỗi, bạn hãy trả ra như sau: 
"câu... #(id): lỗi ....".`;

    // Hàm chuyển file sang base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
                if ((encoded.length % 4) > 0) {
                    encoded += '='.repeat(4 - (encoded.length % 4));
                }
                resolve(encoded);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Process button click
    btnProcess.addEventListener('click', async () => {
        if (!sysFile || !origFile) return;

        const qaApiKey = qaApiKeyInput.value.trim();
        const qaSystemPrompt = QA_SYSTEM_PROMPT;

        if (!qaApiKey) {
            alert("Vui lòng nhập Gemini API Key vào ô cấu hình để chạy tính năng này!");
            qaApiKeyInput.focus();
            return;
        }

        btnProcess.innerHTML = 'Đang xử lý... <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>';
        btnProcess.disabled = true;

        // Add simple spin animation to head for the button
        if (!document.getElementById('spin-style')) {
            const style = document.createElement('style');
            style.id = 'spin-style';
            style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 2s linear infinite; }`;
            document.head.appendChild(style);
        }

        const resultContainer = document.getElementById('qa-result-container');
        const responseBox = document.getElementById('qa-response-box');

        if (resultContainer && responseBox) {
            resultContainer.style.display = 'block';
            responseBox.innerHTML = 'Đang phân tích 2 file PDF và gửi tới Gemini 3.1 Pro Preview...<br>(Việc này có thể mất từ 15 đến 60 giây tuỳ dung lượng file)';
            responseBox.style.color = 'inherit';
        }

        try {
            const sysBase64 = await fileToBase64(sysFile);
            const origBase64 = await fileToBase64(origFile);

            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: qaSystemPrompt },
                            { text: "File 1: File hệ thống (sysFile):" },
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: sysBase64
                                }
                            },
                            { text: "File 2: File gốc (origFile):" },
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: origBase64
                                }
                            }
                        ]
                    }
                ]
            };

            // Đổi sang model gemini-3.1-pro-preview
            let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent`;
            if (qaApiKey) {
                apiUrl += `?key=${qaApiKey}`;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Lỗi khi gọi Gemini API");
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                let text = data.candidates[0].content.parts[0].text;
                if (responseBox) {
                    responseBox.innerHTML = marked.parse(text);
                    if (window.MathJax) {
                        MathJax.typesetPromise([responseBox]);
                    }
                } else {
                    alert("Hoàn thành! Bạn vui lòng xem log console do không tìm thấy ô hiển thị.");
                    console.log(text);
                }
            } else {
                if (responseBox) responseBox.innerHTML = "Không nhận được phản hồi từ AI.";
            }

        } catch (error) {
            console.error(error);
            if (responseBox) {
                responseBox.style.color = '#dc2626';
                responseBox.innerHTML = `Lỗi: ${error.message}`;
            } else {
                alert(`Lỗi: ${error.message}`);
            }
        } finally {
            btnProcess.innerHTML = 'Bắt đầu quy trình kiểm tra <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
            btnProcess.disabled = false;
        }
    });

    // --- Logic for Convert Docx using Gemini API ---
    const btnConvertDocx = document.getElementById('btn-convert-docx');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const DOCX_SYSTEM_PROMPT = "Hãy convert đề thi sau sang định dạng chuẩn...";
    const dropDocxPdf = document.getElementById('drop-docx-pdf');
    const fileDocxPdfInput = document.getElementById('file-docx-pdf');
    const aiResponseBox = document.getElementById('ai-response-box');

    // Load saved settings from localStorage
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
    }
    // Save settings to localStorage on input
    apiKeyInput.addEventListener('input', (e) => localStorage.setItem('gemini_api_key', e.target.value));

    setupDragAndDrop(dropDocxPdf, fileDocxPdfInput, 'docx');

    setupDragAndDrop(dropDocxPdf, fileDocxPdfInput, 'docx');

    btnConvertDocx.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const systemPrompt = DOCX_SYSTEM_PROMPT;

        if (!apiKey) {
            alert('Vui lòng nhập Gemini API Key!');
            apiKeyInput.focus();
            return;
        }

        if (!docxPdfFile) {
            alert('Vui lòng tải lên file PDF đề thi!');
            return;
        }

        // Set loading state
        btnConvertDocx.disabled = true;
        btnConvertDocx.innerHTML = 'Đang xử lý... <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>';

        // Clear previous output
        aiResponseBox.innerHTML = '';
        aiResponseBox.style.color = '#1e293b'; // Reset color

        try {
            const formData = new FormData();
            formData.append('file', docxPdfFile);
            formData.append('geminiApiKey', apiKey);
            if (systemPrompt) {
                formData.append('systemPrompt', systemPrompt);
            }

            const response = await fetch('https://sonnh-onluyen-pj.onrender.com/api/convert-docx', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Có lỗi xảy ra khi gọi API');
            }

            // Handle streaming response using Server-Sent Events (SSE)
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let fullResponse = "";
            let buffer = "";

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split(/\r?\n/);

                    buffer = lines.pop(); // Keep the last incomplete line in the buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(dataStr);
                                if (data.error) {
                                    // Rethrow so the outer catch block shows the error to the user
                                    throw new Error(data.error.message);
                                }
                                if (data.candidates && data.candidates.length > 0) {
                                    const candidate = data.candidates[0];
                                    const parts = candidate.content?.parts;
                                    if (parts && parts.length > 0) {
                                        const textPart = parts[0].text;
                                        if (textPart) {
                                            fullResponse += textPart;
                                        }
                                    }
                                    // Check if stopped early
                                    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                                        fullResponse += `\n[Hệ thống ngừng tạo do: ${candidate.finishReason}]`;
                                    }
                                }
                            } catch (e) {
                                if (e.message && !e.message.startsWith('API Error') && !(e instanceof SyntaxError)) {
                                    throw e; // Rethrow API errors to outer catch
                                }
                                // Silently skip malformed SSE chunks (keep-alive lines, etc.)
                                if (!(e instanceof SyntaxError)) throw e;
                            }
                        }
                    }

                    // Update UI progressively
                    aiResponseBox.innerHTML = marked.parse(fullResponse);
                    // Scroll to bottom
                    aiResponseBox.scrollTop = aiResponseBox.scrollHeight;
                }
            }

            if (window.MathJax) {
                MathJax.typesetPromise([aiResponseBox]);
            }

        } catch (error) {
            aiResponseBox.style.color = '#dc2626'; // Error color red
            aiResponseBox.textContent = `Lỗi: ${error.message}`;
        } finally {
            // Restore button state
            btnConvertDocx.disabled = false;
            btnConvertDocx.innerHTML = 'Bắt đầu Convert <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }
    });
});
