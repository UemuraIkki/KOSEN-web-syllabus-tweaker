(function () {
  function init() {
    const table = document.querySelector('#sytablenc');
    if (!table) return;

    // 行取得（先頭4行はヘッダ）
    const allRows = Array.from(table.querySelectorAll('tr'));
    if (allRows.length <= 4) return;
    const dataRows = allRows.slice(4);

    // 二重挿入防止
    if (
      table.previousElementSibling &&
      table.previousElementSibling.dataset &&
      table.previousElementSibling.dataset.syllabusFilterPanel === 'true'
    ) {
      return;
    }

    const panel = createFilterPanel();
    panel.dataset.syllabusFilterPanel = 'true';

    // テーブル直前に安全に挿入
    if (!table.parentNode) return;
    table.parentNode.insertBefore(panel, table);

    const gradeSelect = panel.querySelector('select[data-filter="grade"]');
    const termSelect = panel.querySelector('select[data-filter="term"]');
    const creditSelect = panel.querySelector('select[data-filter="credit"]');
    const resetButton = panel.querySelector('button[data-filter="reset"]');

    const applyFilter = () => {
      const selectedGrade = (gradeSelect && gradeSelect.value) || 'all';     // 'all', '1'〜'5'
      const selectedTerm = (termSelect && termSelect.value) || 'all';       // 'all', 'first', 'second'
      const selectedCredit = (creditSelect && creditSelect.value) || 'all'; // 'all', '1'〜'4'

      dataRows.forEach((row) => {
        try {
          const match = matchesRow(row, selectedGrade, selectedTerm, selectedCredit);
          row.style.display = match ? '' : 'none';
        } catch (e) {
          // 予期しないエラー時は行を表示状態に戻す
          row.style.display = '';
        }
      });
    };

    if (gradeSelect) gradeSelect.addEventListener('change', applyFilter);
    if (termSelect) termSelect.addEventListener('change', applyFilter);
    if (creditSelect) creditSelect.addEventListener('change', applyFilter);
    if (resetButton) {
      resetButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (gradeSelect) gradeSelect.value = 'all';
        if (termSelect) termSelect.value = 'all';
        if (creditSelect) creditSelect.value = 'all';
        applyFilter();
      });
    }

    // 初期表示（全件表示）
    applyFilter();
  }

  // 絞り込み用コントロールパネルを生成（テーブル直前に挿入）
  function createFilterPanel() {
    const panel = document.createElement('div');
    panel.style.display = 'flex';
    panel.style.gap = '15px';
    panel.style.padding = '10px 15px';
    panel.style.marginBottom = '15px';
    panel.style.backgroundColor = '#f9f9f9';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '4px';
    panel.style.alignItems = 'center';
    panel.style.flexWrap = 'wrap';

    const createGroup = (labelText, html) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';

      const label = document.createElement('label');
      label.textContent = labelText;
      label.style.marginRight = '5px';
      label.style.marginBottom = '0';
      wrapper.appendChild(label);

      const span = document.createElement('span');
      span.innerHTML = html;
      wrapper.appendChild(span);

      return wrapper;
    };

    const gradeGroup = createGroup(
      '学年',
      '<select class="form-control input-sm" data-filter="grade" style="min-width: 80px;">' +
        '<option value="all">すべて</option>' +
        '<option value="1">1年</option>' +
        '<option value="2">2年</option>' +
        '<option value="3">3年</option>' +
        '<option value="4">4年</option>' +
        '<option value="5">5年</option>' +
      '</select>'
    );

    const termGroup = createGroup(
      '開講期',
      '<select class="form-control input-sm" data-filter="term" style="min-width: 80px;">' +
        '<option value="all">すべて</option>' +
        '<option value="first">前期</option>' +
        '<option value="second">後期</option>' +
      '</select>'
    );

    const creditGroup = createGroup(
      '単位数',
      '<select class="form-control input-sm" data-filter="credit" style="min-width: 80px;">' +
        '<option value="all">すべて</option>' +
        '<option value="1">1</option>' +
        '<option value="2">2</option>' +
        '<option value="3">3</option>' +
        '<option value="4">4</option>' +
      '</select>'
    );

    const resetWrapper = document.createElement('div');
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'リセット';
    resetButton.className = 'btn btn-default btn-sm';
    resetButton.setAttribute('data-filter', 'reset');
    resetWrapper.appendChild(resetButton);

    panel.appendChild(gradeGroup);
    panel.appendChild(termGroup);
    panel.appendChild(creditGroup);
    panel.appendChild(resetWrapper);

    return panel;
  }

  // 行が条件にマッチするか判定
  function matchesRow(row, selectedGrade, selectedTerm, selectedCredit) {
    // 単位数判定
    if (selectedCredit !== 'all') {
      const creditCell = row.querySelector('td:nth-child(6)');
      const creditText = creditCell ? creditCell.innerText.trim() : '';
      if (creditText !== selectedCredit) {
        return false;
      }
    }

    // 学年・開講期判定
    if (selectedGrade === 'all' && selectedTerm === 'all') {
      // 両方「すべて」の場合は単位数のみで判定済み
      return true;
    }

    if (selectedGrade === 'all' && selectedTerm !== 'all') {
      // 学年は問わないが、開講期は指定
      return isOfferedInAnyGradeForTerm(row, selectedTerm);
    }

    if (selectedGrade !== 'all' && selectedTerm === 'all') {
      // 学年は指定、開講期は問わない
      return isOfferedInGradeAnyTerm(row, selectedGrade);
    }

    // 学年・開講期ともに指定
    return isOfferedForGradeAndTerm(row, selectedGrade, selectedTerm);
  }

  // 指定学年・開講期で開講されているか
  function isOfferedForGradeAndTerm(row, grade, term) {
    const cls = `c${grade}m`;
    const cells = row.querySelectorAll(`td.${cls}`);
    if (!cells || cells.length < 3) return false; // 安全策

    if (term === 'first') {
      const text = cells[0].innerText.trim();
      return text !== '';
    } else if (term === 'second') {
      const text = cells[2].innerText.trim();
      return text !== '';
    }
    return false;
  }

  // 指定学年で、前期または後期いずれかに開講されていれば true
  function isOfferedInGradeAnyTerm(row, grade) {
    return (
      isOfferedForGradeAndTerm(row, grade, 'first') ||
      isOfferedForGradeAndTerm(row, grade, 'second')
    );
  }

  // いずれかの学年で、指定開講期に開講されていれば true
  function isOfferedInAnyGradeForTerm(row, term) {
    for (let g = 1; g <= 5; g++) {
      if (isOfferedForGradeAndTerm(row, String(g), term)) {
        return true;
      }
    }
    return false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();