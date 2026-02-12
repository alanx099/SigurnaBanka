module.exports = function (express, pool) {
  const apiRouter = express.Router();

  apiRouter.get('/', (req, res) => {
    res.json({ message: 'Dobro dosli na nas Backend!' });
  });

  // ---------------- USERS ----------------
  apiRouter.route('/users')
    .get(async (req, res) => {
      try {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY _id');
        res.json({ status: 'OK', users: rows });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .post(async (req, res) => {
      const { username, password, name, email } = req.body;
      try {
        const q = await pool.query(
          `INSERT INTO users (username, password, name, email)
           VALUES ($1,$2,$3,$4)
           RETURNING _id`,
          [username, password, name, email]
        );
        res.json({ status: 'OK', insertId: q.rows[0]._id });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  apiRouter.route('/users/:id')
    .get(async (req, res) => {
      try {
        const { rows } = await pool.query('SELECT * FROM users WHERE _id = $1', [req.params.id]);
        res.json({ status: 'OK', user: rows[0] });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .delete(async (req, res) => {
      try {
        const q = await pool.query('DELETE FROM users WHERE _id = $1', [req.params.id]);
        res.json({ status: 'OK', affectedRows: q.rowCount });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  // ---------------- POSTS ----------------
  apiRouter.route('/posts')
    .get(async (req, res) => {
      try {
        const { rows } = await pool.query(`
          SELECT
            p._id,
            p.userid,
            p."timestamp",
            p.comment,
            u.username
          FROM posts p
          JOIN users u ON u._id = p.userid
          ORDER BY p."timestamp" DESC
        `);
        res.json({ status: 'OK', posts: rows });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .post(async (req, res) => {
      const { userid, timestamp, comment } = req.body;
      try {
        const q = await pool.query(
          `INSERT INTO posts (userid, "timestamp", comment)
           VALUES ($1, $2, $3)
           RETURNING _id`,
          [userid, timestamp, comment]
        );
        res.json({ status: 'OK', insertId: q.rows[0]._id });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  apiRouter.route('/posts/:id')
    .patch(async (req, res) => {
      const { timestamp, comment, userid } = req.body;
      try {
        const q = await pool.query(
          `UPDATE posts
           SET userid = COALESCE($1, userid),
               "timestamp" = COALESCE($2, "timestamp"),
               comment = COALESCE($3, comment)
           WHERE _id = $4`,
          [userid ?? null, timestamp ?? null, comment ?? null, req.params.id]
        );
        res.json({ status: 'OK', changedRows: q.rowCount });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .delete(async (req, res) => {
      try {
        const q = await pool.query('DELETE FROM posts WHERE _id = $1', [req.params.id]);
        res.json({ status: 'OK', affectedRows: q.rowCount });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  // ---------------- PROIZVODI (CRUD) ----------------
  apiRouter.route('/proizvodi')
    .get(async (req, res) => {
      try {
        const { rows } = await pool.query('SELECT * FROM proizvodi ORDER BY id');
        res.json({ status: 'OK', proizvodi: rows });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .post(async (req, res) => {
      const { naziv, cijenu, broj_raspolozivih_jedinica, opis_proizvoda } = req.body;
      try {
        const q = await pool.query(
          `INSERT INTO proizvodi (naziv, cijenu, broj_raspolozivih_jedinica, opis_proizvoda)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [naziv, cijenu, broj_raspolozivih_jedinica, opis_proizvoda ?? null]
        );
        res.json({ status: 'OK', insertId: q.rows[0].id });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  apiRouter.route('/proizvodi/:id')
    .get(async (req, res) => {
      try {
        const { rows } = await pool.query('SELECT * FROM proizvodi WHERE id = $1', [req.params.id]);
        res.json({ status: 'OK', proizvod: rows[0] });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .patch(async (req, res) => {
      const { naziv, cijenu, broj_raspolozivih_jedinica, opis_proizvoda } = req.body;
      try {
        const q = await pool.query(
          `UPDATE proizvodi
           SET naziv = COALESCE($1, naziv),
               cijenu = COALESCE($2, cijenu),
               broj_raspolozivih_jedinica = COALESCE($3, broj_raspolozivih_jedinica),
               opis_proizvoda = COALESCE($4, opis_proizvoda)
           WHERE id = $5`,
          [
            naziv ?? null,
            cijenu ?? null,
            broj_raspolozivih_jedinica ?? null,
            opis_proizvoda ?? null,
            req.params.id
          ]
        );
        res.json({ status: 'OK', changedRows: q.rowCount });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    })
    .delete(async (req, res) => {
      try {
        const q = await pool.query('DELETE FROM proizvodi WHERE id = $1', [req.params.id]);
        res.json({ status: 'OK', affectedRows: q.rowCount });
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: 'NOT OK' });
      }
    });

  return apiRouter;
};
