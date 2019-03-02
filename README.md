# DatatablesHelper
A small JavaScript/JQuery module that provides an easy and fast interface for building tables using data tables plugin based on the builder design pattern

How to use?
let table = new Table('#myTableId')
        .setUrl('./GetMyDataAPI');
        .setUrlData(function () {     // Data that is sent with the url
            return {
                firstName: "Daniel",
                lastName: "Bunny"
            };
        });
        .addTableButton({icon: 'fa fa-plus', hint: 'Add new'}, addNewFunction);
        .addTableButton({icon: 'fa fa-sign-in', hint: 'Sign in'}, anotherFunction);
        
        // You can also use the created table object to call the methods
        table.addTableExportButton();

        table
            .addSelectColumn(true)  // Add check box near each row
            .addColumn({title: 'First Name', data: 'firstName'})
            
            // Add a button in each row
            .addActionColumn('', function (data, type, row) {
                return TableAction({icon: 'fa fa-plus', hint: 'Edit my row'});
            }, editFunction)
            
            // Show data in sub table
            .addSubRow([{title: 'Middle Name', data: 'middleName'}, {title: 'Date of Birth', data: 'dateOfBirth'}])
            .addSubRow([{title: 'Gender', data: 'gender'}, {title: 'Address', data: 'address'}])
            
            // Make sure to call this method after your table configurations
            .build();
