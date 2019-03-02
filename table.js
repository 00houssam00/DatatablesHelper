/**
 * create a button to be rendered in the table
 * 
 * @param {{*icon: Icon, *hint: string, attr: {}}} properties
 * @returns {unresolved}
 */
var TableAction = function (properties) {
    let $btn = $('<button class="btn btn-green" title="' + properties.hint + '"><i class="' + properties.icon + '"></i></button>');
    if (properties.attr) {
        $btn.attr(properties.attr);
    }
    if (properties.bootstrapModal) {
        $btn.attr({
            'data-toggle': 'modal',
            'data-target': properties.bootstrapModal,
            'data-backdrop': 'static',
            'data-keyboard': 'false'
        });
    }

    $btn.addClass('action');
    return $btn[0].outerHTML;
};

var SelectAction = function () {
    let $btn = $('<input type="checkbox">');
    $btn.addClass('action');
    return $btn[0].outerHTML;
};

var Table = function (selector) {

    let _defaults = {
        tableStyle: 'table table-striped table-hover dataTable no-footer cell-border compact'
    };
    let _$mainElement = $(selector);
    let _$table;
    let _buttons = [];
    let _columns = [];
    let _columnDefs = [];
    let _url;
    let _urlData;
    let _columnsToExport = [];
    let _subRows = [];
    let _maxRows = 10;
    let _searching = true;
    let _initComplete;
    let _hasSelect = false;

    /**
     * 
     * @param {text: string, icon: string, hint: string, attr: {}} button
     * @param {function} action
     * @returns {Table}
     */
    function addTableButton(button, action) {
        let attr = {};
        if (button.bootstrapModal) {
            attr = {
                'data-toggle': 'modal',
                'data-target': button.bootstrapModal,
                'data-backdrop': 'static',
                'data-keyboard': 'false'
            };
        } else if (button.attr) {
            attr = button.attr;
        }

        _buttons.push({
            text: (button.text ? button.text + " " : "") + (button.icon ? '<i class="' + button.icon + '"></i>' : ''),
            className: 'btn btn-green',
            titleAttr: button.hint,
            action: action,
            attr: attr
        });
        return this;
    }

    function addTableExportButton(customizeMethod) {
        _buttons.push({
            extend: 'csv',
            text: '<i class="fa fa-file-excel-o"></i>',
            className: 'btn btn-green',
            titleAttr: 'Export',
            exportOptions: {
                modifier: {
                    search: 'none'
                },
                columns: _columnsToExport
            },
            customize: customizeMethod
        });
        return this;
    }

    /**
     * 
     * @param {title : string, data: string, sortable: boolean, class: string, allowExport: boolean(true)} column 
     * @param {function} render
     * @returns {Table}
     */
    function addColumn(column, render) {
        let columnDefaultContent = column.defaultContent || '';
        _columns.push({mData: column.data, bSortable: column.sortable, sClass: column.class, defaultContent: columnDefaultContent, visible: column.visible, mRender: render});
        _columnDefs.push({aTargets: [_columns.length], sTitle: column.title});
        if (column.allowExport !== false) {
            _columnsToExport.push(_columns.length);
        }
        return this;
    }

    /**
     * 
     * @param {string} title
     * @param {function} render
     * @param {function} action
     * @returns {Table}
     */
    function addActionColumn(title, render, action) {
        let className = "column-" + _columns.length;
        _columns.push({mData: null, bSortable: false, width: 20, mRender: render});
        // 'aTargets' start by index '1' to leave a place for the details grid 
        // column.(details grid is always added whether it is shown or no)
        _columnDefs.push({aTargets: [_columns.length], sTitle: title, className: className});
        _$mainElement.on('click', 'tbody td.' + className + '> .action', function () {
            if (action) {
                let data = _$table.row($(this).parents('tr')).data();
                action(data, this);
            }
        });
        return this;
    }

    function addSelectColumn(allowSelectAll) {
        let selectClass = "selectColumn";
        let uniqueName = "column-" + _columns.length;
        let className = uniqueName + " table-center-middle " + selectClass;

        _columns.push({mData: null, bSortable: false, mRender: function () {
                return SelectAction();
            }});

        let title = "";
        if (allowSelectAll === true) {
            title = SelectAction();
        }

        // 'aTargets' start by index '1' to leave a place for the details grid 
        // column.(details grid is always added whether it is shown or no)
        _columnDefs.push({aTargets: [_columns.length], sTitle: title, className: className});
        $(_$mainElement).parent().on('change', '.dataTables_scrollHeadInner thead th.' + uniqueName + '> .action', function () {
            let checked = $(this).is(":checked");

            // select rows
            if (checked === true) {
                _$table.rows().select();
            } else {
                _$table.rows().deselect();
            }

            // check all checkboxes
            $(".selectColumn > .action").prop("checked", checked);
        });

        _$mainElement.on('change', 'tbody td.' + uniqueName + ' > .action', function (e) {
            let checked = $(this).is(":checked");

            // select rows
            if (checked === true) {
                _$table.row($(this).parents('tr')).select();
            } else {
                _$table.row($(this).parents('tr')).deselect();
            }

            let $mainSelectBox = $(selector + '_wrapper .dataTables_scrollHeadInner thead th.' + uniqueName + '> .action');
            let selectedRowsCount = _$table.rows('.selected').count();
            let allRowsCount = _$table.rows().count();

            // change main selector state
            if (selectedRowsCount === 0) {
                $mainSelectBox.prop('checked', false);
                $mainSelectBox.prop('indeterminate', false);
            } else if (selectedRowsCount < allRowsCount) {
                $mainSelectBox.prop('indeterminate', true);
            } else {
                $mainSelectBox.prop('checked', true);
                $mainSelectBox.prop('indeterminate', false);
            }
        });
        _hasSelect = true;
        return this;
    }

    /**
     * Pass in any number of columns to render in a sub grid.
     * column: {title : string, data: string, sortable: boolean, class: string, allowExport: boolean(true), colSpan: int}
     * 
     * @param {[]: column} row
     * @param {function} render
     * @returns {Table}
     */
    function addSubRow(row, render) {
        $.each(row, function (i, col) {
            col.visible = false;
            addColumn(col, render);
        });

        if (render) {
            row.render = render;
        }

        _subRows.push(row);
        return this;
    }

    function reload(url, callback) {
        if (url) {
            _$table.ajax.url(url).load();
        } else {
            _$table.ajax.reload(callback);
        }
        _resetHeadingActions();
        return this;
    }

    function _resetHeadingActions() {
        let $checkboxes = $(selector + "_wrapper").find(".dataTables_scrollHeadInner thead input[type='checkbox'].action");
        $.each($checkboxes, function (i, checkbox) {
            let $chkbox = $(checkbox);
            $chkbox.prop('checked', false);
            $chkbox.prop('indeterminate', false);
        });
    }

    function setUrl(url) {
        _url = url;
        return this;
    }

    function setUrlData(data) {
        _urlData = data;
        return this;
    }

    function build() {
        _buildDetailsGrid();
        _$mainElement.addClass(_defaults.tableStyle);

        let properties = {
            bProcessing: false,
            bServerSide: false,
            scrollX: true,
            bJQueryUI: true,
            sAjaxSource: _url || '',
            searching: _searching,
            fnServerParams: ajaxParams,
            dom: 'Bfrtip',
            aaSorting: [],
            buttons: _buttons,
            aoColumns: _columns,
            aoColumnDefs: _columnDefs,
            responsive: true,
            pageLength: _maxRows,
            initComplete: _initComplete,

            /* No ordering applied by DataTables during initialisation */
            order: []
        };

        // Add select extension if needed
        if (_hasSelect === true) {
            properties['select'] = {
                style: 'multi',

                /* set to space to remove the default selector ( which is based on row selection)*/
                selector: ' '
            };

            properties['rowCallback'] = function (row, data) {
                let selected = $(row).hasClass('selected');
                $('.selectColumn > .action', row).prop('checked', selected);
            };
        }

        _$table = _$mainElement.DataTable(properties);
//        _$table.on('search.dt', drawLaterDataTables);
//        _$table.on('length.dt', drawLaterDataTables);
//        _$table.on('page.dt', drawLaterDataTables);
        return this;
    }

    function ajaxParams(aoData) {
        if (_urlData) {
            let paramList = _urlData();
            for (let paramKey in paramList) {
                aoData.push({name: paramKey, value: paramList[paramKey]});
            }
        }
    }

    function _buildDetailsGrid() {
        let visible = _subRows.length > 0;

        _columns.unshift({
            "className": 'details-control',
            "orderable": false,
            "bSortable": false,
            "data": null,
            "defaultContent": '',
            title: "",
            visible: visible
        });
        _columnDefs.unshift({aTargets: [0], sTitle: ""});

        if (visible) {
            _$mainElement.on('click', 'td.details-control', function () {
                var tr = $(this).closest('tr');
                var row = _$table.row(tr);
                var x = _$table.row(tr).index();
                if (row.child.isShown()) {

                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                } else {

                    // Open this row
                    row.child(_renderDetailsGrid(row.data(), x)).show();
                    tr.addClass('shown');
                }
            });
        }
    }

    function _renderDetailsGrid(data) {
        let html = "<table class='subGrid'>";
        for (let row of _subRows) {
            html += "<tr>";
            for (let col of row) {
                html += "<td class='table-head' style='font-weight: bold; padding-right: 8px;'>" + col.title + "</td>";
                html += "<td" + ((col.colSpan) ? " colspan='" + col.colSpan + "'" : "") + ">" + ((row.render) ? row.render(data, col.data, false) : _getData(data, col.data)) + "</td>";
            }
            html += "</tr>";
        }
        html += "</table>";
        return html;
    }

    /**
     * return the value of an object from a '.' separated keys
     * Ex:- datat = {group: {groupName: 'name'}} -> getData(data, 'group.groupName')
     * 
     * @param {type} data
     * @param {type} key
     * @returns {Table._getData.val|@arr;val|@arr;data|Table._getData.data}
     */
    function _getData(data, key) {
        let keys = key.split('.');
        let val = null;
        for (let k of keys) {
            if(val){
                val = val[k];
            } else if(data[k]){
                val = data[k];
            } else {
                val = " ";
            }
        }
        return val || '';
    }

    function _getSelectedRows() {
        return _$table.rows('.selected').data();
    }

    function getRawTable() {
        return _$table;
    }

    function setMaxRows(rows) {
        _maxRows = rows;
        return this;
    }

    function clear() {
        _$table.clear().draw();
    }

    function allowSearch(_allow) {
        _searching = _allow;
        return this;
    }

    function onTableLoaded(initComplete) {
        _initComplete = initComplete;
        return this;
    }

    function indexOf(key, value) {
        let rowIdx = -1;
        _$table.data().each(function (row, index) {
            if (row[key] === value) {
                rowIdx = index;
                return;
            }
        });

        return rowIdx;
    }

    return {
        addTableButton: addTableButton,
        addTableExportButton: addTableExportButton,
        addColumn: addColumn,
        addActionColumn: addActionColumn,
        addSelectColumn: addSelectColumn,
        addSubRow: addSubRow,
        reload: reload,
        setUrl: setUrl,
        setUrlData: setUrlData,
        build: build,
        getRawTable: getRawTable,
        setMaxRows: setMaxRows,
        getSelectedRows: _getSelectedRows,
        clear: clear,
        allowSearch: allowSearch,
        onTableLoaded: onTableLoaded,
        indexOf: indexOf
    };
};