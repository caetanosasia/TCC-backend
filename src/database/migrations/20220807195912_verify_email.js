exports.up = function(knex) {
    return knex.schema.createTable('verify_email', function (table) {
      table.string('token').primary();
      table.string('send_date').notNullable;
      table.string('expires_in').notNullable;
    })
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTAble('verify_email');
  };