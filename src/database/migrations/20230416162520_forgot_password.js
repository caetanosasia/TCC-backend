exports.up = function(knex) {
    return knex.schema.createTable('forgot_password', function (table) {
      table.string('token').primary();
      table.string('email').notNullable;
      table.boolean('changed').notNullable;
      table.string('send_date').notNullable;
      table.string('expires_in').notNullable;
      table.timestamps(true, true);
    })
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTAble('forgot_password');
  };