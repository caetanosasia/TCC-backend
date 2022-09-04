exports.up = function(knex) {
    return knex.schema.createTable('experiments', function (table) {
      table.string('id').primary();
      table.string('email').notNullable;
      table.string('token');
      table.string('name').notNullable;
      table.string('description').notNullable;
    })
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTAble('experiments');
  };