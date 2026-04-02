/* utils.js - Ortak yardımcı fonksiyonlar */
window.SRSUtils = (function () {
  'use strict';

  /**
   * Semester kodunu sayfadaki text'ten otomatik parse eder.
   * "Current Semester is 2025-2026 Spring" → "20252"
   */
  function getSemesterCode() {
    const text = document.body ? document.body.textContent : '';
    const match = text.match(/Current Semester is\s+(\d{4})-\d{4}\s+(\w+)/);
    if (!match) return null;
    const year = match[1];
    const season = match[2];
    const seasonMap = { Fall: '1', Spring: '2', Summer: '3' };
    const seasonCode = seasonMap[season] || '1';
    return year + seasonCode;
  }

  /**
   * Sadece /srs/ ana sayfasında mıyız?
   */
  function isMainPage() {
    const path = window.location.pathname;
    return (
      path === '/srs/' ||
      path === '/srs/index.php' ||
      path.endsWith('/srs/')
    );
  }

  /**
   * Ders tablosunu bulur (ana sayfadaki).
   * "Course Code" ve "Course Name" text'i geçen table'ı arar.
   */
  function findCourseTable() {
    const center = document.getElementById('DHTMLSuite_pane_center');
    if (!center) return null;
    const tables = center.querySelectorAll('table');
    for (const table of tables) {
      const text = table.textContent || '';
      if (text.includes('Course Code') && text.includes('Course Name')) {
        return table;
      }
    }
    return null;
  }

  /**
   * Ders satırlarını parse eder.
   * Dönüş: [{code, name, instructor, bilkentCredits, ectsCredits, type, links: {grades, attendance, syllabus, moodle}, row}]
   */
  function parseCourseRows() {
    const table = findCourseTable();
    if (!table) return [];

    const rows = table.querySelectorAll('tr.row1, tr.row2');
    const courses = [];

    rows.forEach(function (row) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) return;

      const anchors = cells[7].querySelectorAll('a');
      courses.push({
        code: (cells[0].textContent || '').trim(),
        name: (cells[1].textContent || '').trim(),
        instructor: (cells[2].textContent || '').trim(),
        bilkentCredits: (cells[3].textContent || '').trim(),
        ectsCredits: (cells[4].textContent || '').trim(),
        type: (cells[5].textContent || '').trim(),
        nameCell: cells[1],
        links: {
          grades: anchors[0] || null,
          attendance: anchors[1] || null,
          syllabus: anchors[2] || null,
          moodle: anchors[3] || null,
        },
        row: row,
      });
    });

    return courses;
  }

  /**
   * Not bilgilerini AJAX ile çeker.
   * POST /srs/ajax/gradeAndAttend/grade.php?first=y&course={code}&semester={sem}
   */
  function fetchGrades(courseCode, semesterCode) {
    return new Promise(function (resolve, reject) {
      const url =
        '/srs/ajax/gradeAndAttend/grade.php?first=y&course=' +
        encodeURIComponent(courseCode) +
        '&semester=' +
        encodeURIComponent(semesterCode);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'rndval=' + Date.now(),
        credentials: 'same-origin',
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var trs = doc.querySelectorAll('tr');
          var grades = [];

          trs.forEach(function (tr) {
            var tds = tr.querySelectorAll('td');
            if (tds.length < 4) return;
            var title = (tds[0].textContent || '').trim();
            var gradeText = (tds[3].textContent || '').trim();
            if (title && gradeText.includes('/')) {
              grades.push({
                title: title,
                type: (tds[1].textContent || '').trim(),
                grade: gradeText,
              });
            }
          });

          resolve(grades);
        })
        .catch(function (err) {
          console.warn('[SRS Enhanced] Grade fetch error for', courseCode, err);
          resolve([]);
        });
    });
  }

  /**
   * Devamsızlık bilgisini AJAX ile çeker.
   * POST /srs/ajax/gradeAndAttend/attend.php?first=y&course={code}&semester={sem}
   */
  function fetchAttendance(courseCode, semesterCode) {
    return new Promise(function (resolve, reject) {
      const url =
        '/srs/ajax/gradeAndAttend/attend.php?first=y&course=' +
        encodeURIComponent(courseCode) +
        '&semester=' +
        encodeURIComponent(semesterCode);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'rndval=' + Date.now(),
        credentials: 'same-origin',
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var bodyText = doc.body ? doc.body.textContent : '';
          var match = bodyText.match(/Attendance Ratio:\s*([\d.]+)%/);
          if (match) {
            resolve(parseFloat(match[1]));
          } else {
            resolve(null);
          }
        })
        .catch(function (err) {
          console.warn(
            '[SRS Enhanced] Attendance fetch error for',
            courseCode,
            err
          );
          resolve(null);
        });
    });
  }

  /**
   * Sınav listesini SRS-v2'den çeker.
   * GET /srs-v2/exams/finals
   */
  function fetchExams() {
    return new Promise(function (resolve, reject) {
      fetch('/srs-v2/exams/finals', {
        method: 'GET',
        credentials: 'same-origin',
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var rows = doc.querySelectorAll('table tr');
          var exams = [];

          rows.forEach(function (row, i) {
            if (i === 0) return; // header skip
            var cells = row.querySelectorAll('th, td');
            if (cells.length < 7) return;

            var course = (cells[1].textContent || '').trim();
            var type = (cells[2].textContent || '').trim();
            var name = (cells[3].textContent || '').trim();
            var dateTimeStr = (cells[4].textContent || '').trim();
            var sessionType = (cells[5].textContent || '').trim();
            var classroom = (cells[6].textContent || '').trim();

            // Tarih parse: "18.02.2026 17:30 - 19:30"
            var dateMatch = dateTimeStr.match(
              /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/
            );
            var examDate = null;
            if (dateMatch) {
              examDate = new Date(
                parseInt(dateMatch[3]),
                parseInt(dateMatch[2]) - 1,
                parseInt(dateMatch[1]),
                parseInt(dateMatch[4]),
                parseInt(dateMatch[5])
              );
            }

            exams.push({
              course: course,
              type: type,
              name: name,
              dateTimeStr: dateTimeStr,
              date: examDate,
              sessionType: sessionType,
              classroom: classroom,
            });
          });

          resolve(exams);
        })
        .catch(function (err) {
          console.warn('[SRS Enhanced] Exam fetch error:', err);
          resolve([]);
        });
    });
  }

  // Public API
  return {
    getSemesterCode: getSemesterCode,
    isMainPage: isMainPage,
    findCourseTable: findCourseTable,
    parseCourseRows: parseCourseRows,
    fetchGrades: fetchGrades,
    fetchAttendance: fetchAttendance,
    fetchExams: fetchExams,
  };
})();
