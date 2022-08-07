exports.up = function(knex) {
    return knex.schema.createTable('users', function (table) {
      table.string('email').primary();
      table.string('password').notNullable;
      table.string('token');
      table.string('verified').notNullable;
      table.string('name').notNullable;
    })
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTAble('users');
  };