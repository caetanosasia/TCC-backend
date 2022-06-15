
exports.up = function(knex) {
    return knex.schema.createTable('data_table', function (table) {
        table.string('id').primary();
        table.float('hora').notNullable;
        table.float('temperatura').notNullable;
      })
};

exports.down = function(knex) {
    return knex.schema.dropTAble('data_table');
};
