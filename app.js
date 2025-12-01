// app.js — modular script untuk memuat PDF, merender halaman, dan inisialisasi turn.js
// Pastikan PDF tersedia pada path yang benar (contoh: pdfs/book.pdf).

(function ($) {
    'use strict';

    // Konfigurasi dasar
    const selectors = {
        mainView: '#mainView',
        readerView: '#readerView',
        flipbook: '#flipbook',
        readBtn: '.readBtn',
        backBtn: '#backBtn',
        homeBtn: '#homeBtn',
        readerTitle: '#readerTitle',
        prevPage: '#prevPage',
        nextPage: '#nextPage',
        bookCard: '.book-card'
    };

    // Simpan state PDF
    let pdfDoc = null;
    let currentPdfUrl = null;
    let pageCount = 0;
    let renderedPages = 0;

    // Ketika tombol 'Baca' diklik
    $(document).on('click', selectors.readBtn, function (e) {
        const card = $(this).closest(selectors.bookCard);
        const pdfPath = card.data('pdf');
        const title = card.find('.book-title').text() || 'Buku';
        openReader(pdfPath, title);
    });

    // Kembali ke beranda
    $(document).on('click', selectors.backBtn, function () {
        closeReader();
    });
    $(document).on('click', selectors.homeBtn, function () {
        closeReader();
        $('html,body').animate({ scrollTop: 0 }, 300);
    });

    // Prev / Next
    $(document).on('click', selectors.prevPage, function () {
        $(selectors.flipbook).turn('previous');
    });
    $(document).on('click', selectors.nextPage, function () {
        $(selectors.flipbook).turn('next');
    });

    // buka reader
    function openReader(pdfUrl, title) {
        currentPdfUrl = pdfUrl;
        $(selectors.readerTitle).text(title);
        $(selectors.mainView).addClass('hidden');
        $(selectors.readerView).removeClass('hidden');

        // kosongkan flipbook
        $(selectors.flipbook).html('');

        // muat PDF dan render halamannya
        loadAndRenderPDF(pdfUrl).catch(err => {
            console.warn("Peringatan saat muat PDF:", err);
        });

    }

    // tutup reader dan bersihkan
    function closeReader() {
        $(selectors.readerView).addClass('hidden');
        $(selectors.mainView).removeClass('hidden');

        // hapus turn instance jika ada
        if ($(selectors.flipbook).data('turn')) {
            try {
                $(selectors.flipbook).turn('destroy').html('');
            } catch (e) {
                $(selectors.flipbook).html('');
            }
        }
        pdfDoc = null;
        currentPdfUrl = null;
        pageCount = 0;
        renderedPages = 0;
    }

    // fungsi utama: load PDF lalu render setiap halaman ke <canvas>, bungkus di .page, lalu inisialisasi turn.js
    async function loadAndRenderPDF(url) {
        // gunakan pdfjsLib (dideklarasikan di head)
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        pageCount = pdfDoc.numPages;

        // siapkan container halaman; buat elemen halaman kosong terlebih dahulu agar turn.js bisa diinisialisasi lebih halus
        const $flip = $(selectors.flipbook);
        // create page containers (turn.js biasanya bekerja per halaman; gunakan 1 halaman per side)
        for (let i = 1; i <= pageCount; i++) {
            const $page = $('<div/>').addClass('page').attr('data-page', i).css({
                width: '100%',
                height: '100%'
            });
            // tambahkan placeholder canvas (akan diisi saat render)
            const canvas = document.createElement('canvas');
            canvas.className = 'page-canvas';
            $page.append(canvas);
            $flip.append($page);
        }

        // Inisialisasi turn.js (segera, sehingga user melihat frame buku)
        // Pengaturan dasar untuk efek flip
        for (let i = 1; i <= pageCount; i++) {
            await renderPageToCanvas(i);
        }

        $flip.turn({
            pages: pageCount,   // WAJIB agar tidak hanya 1 halaman
            width: $flip.width(),
            height: $flip.height(),
            autoCenter: true,
            duration: 800,
            display: 'double'   // atau 'single' kalau memang ingin mode 1 halaman
        });


        $flip.turn('page', 1);



        // render halaman satu per satu (bisa paralel, tapi ini lebih stabil)
        for (let i = 1; i <= pageCount; i++) {
            await renderPageToCanvas(i);
            renderedPages++;
            // opsional: bisa tampilkan progress
            // console.log(`Rendered ${renderedPages}/${pageCount}`);
        }

        // setelah semua siap, refresh turn (agar mengukur ukuran konten)
        try { $flip.turn('resize'); } catch (e) { /* ignore */ }

        // pergi ke halaman 1 (atau buka tengah jika ingin)
        $flip.turn('page', 1);
    }

    // render satu halaman PDF ke canvas pada .page[data-page=i]
    async function renderPageToCanvas(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.3 }); // skala dasar; turn.js akan menyesuaikan ukuran canvas
        const $pageDiv = $(selectors.flipbook).find(`.page[data-page="${pageNum}"]`);
        const canvas = $pageDiv.find('canvas')[0];

        // atur ukuran canvas sesuai viewport (CSS akan menangani scaling responsif)
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        await page.render(renderContext).promise;

        // agar canvas memenuhi ukuran halaman flipbook (CSS)
        // gunakan object-fit via CSS: canvas { width:100%; height:100%; }
        return true;
    }

    // Inisialisasi bila ingin menambahkan event lain saat DOM siap
    $(function () {
        // contoh: klik pada cover juga dapat membuka
        $(document).on('click', '.cover', function () {
            const card = $(this).closest(selectors.bookCard);
            const pdfPath = card.data('pdf');
            const title = card.find('.book-title').text() || 'Buku';
            openReader(pdfPath, title);
        });
    });

})(jQuery);
