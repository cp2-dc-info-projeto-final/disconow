const express = require('express');
const cors = require('cors');

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require("bcryptjs")

const app = express();
app.use(express.json());
const port = 3000;

function geraNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

app.use(cors());

app.get('/hello', (req, res) => {
  let aleatorio = geraNumeroAleatorio(0,100);
  res.status(200).json({
    texto_completo:`Olá mundo! Sorteei o número ${aleatorio}!`,
    saudacao: 'Olá mundo!',
    numero: aleatorio
  });
});

app.get('/usuarios', (req, res) => {
  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Conectou no banco de dados!');
  });

  // Seleciona todos os usuários da tabela 'usuario'
  db.all('SELECT * FROM usuario', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        message: 'Erro ao consultar o banco de dados!',
        error: err.message
      });
    }

    // Fecha a conexão com o banco de dados
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Fechou a conexão com o banco de dados.');
    });

    // Retorna os dados dos usuários em formato JSON
    res.status(200).json({
      status: 'success',
      usuarios: rows
    });
  });
});

app.post('/usuarios/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({
      status: 'failed',
      message: 'Por favor, preencha todos os campos!',
    });
  }

  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        message: 'Erro ao conectar ao banco de dados!',
        error: err.message
      });
    }
    console.log('Conectou no banco de dados!');
  });

  db.get('SELECT * FROM usuario WHERE email = ?', [email], async (err, usuario) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        message: 'Erro ao consultar o banco de dados!',
        error: err.message
      });
    }

    if (!usuario) {
      return res.status(400).json({
        status: 'failed',
        message: 'Usuário não encontrado!',
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(400).json({
        status: 'failed',
        message: 'Senha incorreta!',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Login realizado com sucesso!',
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email
      }
    });

    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Fechou a conexão com o banco de dados.');
    });
  });
});

app.post('/usuarios/novo', (req, res) => {
  const { nome, email, senha, conf_senha } = req.body;
  console.log(req);
  // Aqui começa a validação dos campos do formulário
  let erro = "";
  if (nome.length < 1 || email.length < 1 || senha.length < 1 || conf_senha.length < 1) {
    erro += 'Por favor, preencha todos os campos corretamente!';
  }
  if (senha != conf_senha) {
    erro += 'As senhas digitadas não são iguais!';
  }
  if (erro) {
    res.status(500).json({
      status: 'failed',
      message: erro,
    });
  }
  else {
    // aqui começa o código para inserir o registro no banco de dados
    let db = new sqlite3.Database('./users.db', (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Conectou no banco de dados!');
    });
    db.get('SELECT email FROM usuario WHERE email = ?', [email], async (error, result) => {
      if (error) {
        console.log(error)
      }
      else if (result) {
        db.close((err) => {
          if (err) {
            return console.error(err.message);
          }
          console.log('Fechou a conexão com o banco de dados.');
        });
        return res.status(500).json({
          status: 'failed',
          message: 'Este e-mail já está em uso!',
        });
      } else {
        let senha_criptografada = await bcrypt.hash(senha, 8)
        db.run('INSERT INTO usuario(nome, email, senha) VALUES (?, ?, ?)', [nome,
          email, senha_criptografada], (error2) => {
            if (error2) {
              console.log(error2)
            } else {
              db.close((err) => {
                if (err) {
                  return console.error(err.message);
                }
                console.log('Fechou a conexão com o banco de dados.');
              });
              return res.status(200).json({
                status: 'success',
                message: 'Registro feito com sucesso!',
                campos: req.body
              });
            }
          });
      }
    });
  }
});



app.delete('/usuarios/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  // Conectar ao banco de dados SQLite
  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        message: 'Erro ao conectar ao banco de dados!',
        error: err.message
      });
    }
    console.log('Conectou no banco de dados!');
  });

  // Deletar o usuário pelo ID
  db.run('DELETE FROM usuario WHERE id_usuario = ?', [id_usuario], function (err) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        message: 'Erro ao tentar remover o usuário ${id_usuario}!',
        error: err.message
      });
    }
    // Fechar a conexão com o banco de dados
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Fechou a conexão com o banco de dados.');
    });

    // Retornar uma resposta de sucesso
    return res.status(200).json({
      status: 'success',
      message: `Usuário com id ${id_usuario} removido com sucesso!`
    });
  });
});

app.post('/usuarios/nome', (req, res) => {
  const { id_usuario, nome } = req.body;

  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao conectar ao banco de dados!', error: err.message });
    }
  });

  db.run('UPDATE usuario SET nome = ? WHERE id_usuario = ?', [nome, id_usuario], function (err) {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao atualizar o nome!', error: err.message });
    }

    res.status(200).json({ status: 'success', message: 'Nome atualizado com sucesso!' });
  });

  db.close();
});

app.post('/usuarios/email', (req, res) => {
  const { id_usuario, email } = req.body;

  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao conectar ao banco de dados!', error: err.message });
    }
  });

  db.run('UPDATE usuario SET email = ? WHERE id_usuario = ?', [email, id_usuario], function (err) {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao atualizar o email!', error: err.message });
    }

    res.status(200).json({ status: 'success', message: 'Email atualizado com sucesso!' });
  });
  db.close();
});

app.post('/usuarios/senha', async (req, res) => {
  const { id_usuario, senha } = req.body;
  const senha_criptografada = await bcrypt.hash(senha, 8);

  let db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao conectar ao banco de dados!', error: err.message });
    }
  });

  db.run('UPDATE usuario SET senha = ? WHERE id_usuario = ?', [senha_criptografada, id_usuario], function (err) {
    if (err) {
      return res.status(500).json({ status: 'failed', message: 'Erro ao atualizar a senha!', error: err.message });
    }

    res.status(200).json({ status: 'success', message: 'Senha atualizada com sucesso!' });
  });

  db.close();
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

