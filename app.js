import inquirer from "inquirer";
import mysql from "mysql2";

// Database connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "assword",
  database: "yoojin_construction",
});

function viewDepartments() {
  // Execute a query to select all departments
  connection.query("SELECT * FROM departments", (err, results) => {
    if (err) throw err;
    // Display results
    console.table(results);
    // Call mainMenu() to return to the main menu
    mainMenu();
  });
}

function viewRoles() {
  const query = `SELECT roles.id, roles.title, departments.name AS department, roles.salary FROM roles INNER JOIN departments ON roles.department_id = departments.id`;
  connection.query(query, (err, results) => {
    if (err) throw err;
    console.table(results);
    mainMenu();
  });
}

function viewEmployees() {
  const query = `SELECT e.id, e.first_name, e.last_name, roles.title, departments.name AS department, roles.salary, CONCAT(m.first_name, ' ', m.last_name) AS manager
  FROM employees e
  LEFT JOIN employees m ON e.manager_id = m.id
  INNER JOIN roles ON e.role_id = roles.id
  INNER JOIN departments ON roles.department_id = departments.id
  `;
  connection.query(query, (err, results) => {
    if (err) throw err;
    console.table(results);
    mainMenu();
  });
}

function addDepartment() {
  inquirer
    .prompt({
      name: "name",
      type: "input",
      message: "What is the name of the department?",
    })
    .then((answer) => {
      connection.query(
        "INSERT INTO departments (name) VALUES (?)",
        [answer.name],
        (err, results) => {
          if (err) throw err;
          console.log(`Added ${answer.name} to departments.`);
          mainMenu();
        }
      );
    });
}

function addRole() {
  connection.query("SELECT * FROM departments", (err, departments) => {
    if (err) throw err;

    inquirer
      .prompt([
        {
          name: "title",
          type: "input",
          message: "What is the title of the role?",
        },
        {
          name: "salary",
          type: "input",
          message: "What is the salary of the role?",
        },
        {
          name: "department",
          type: "list",
          choices: departments.map((department) => department.name),
          message: "Which department does the role belong to?",
        },
      ])
      .then((answers) => {
        const department = departments.find(
          (dept) => dept.name === answers.department
        );
        connection.query(
          "INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)",
          [answers.title, answers.salary, department.id],
          (err, results) => {
            if (err) throw err;
            console.log(`Added ${answers.title} to roles`);
            mainMenu();
          }
        );
      });
  });
}

function addEmployee() {
  const roleQuery = "SELECT id, title FROM roles";
  const managerQuery =
    'SELECT id, CONCAT(first_name, " ", last_name) AS manager FROM employees';

  connection
    .promise()
    .query(roleQuery)
    .then(([roles]) => {
      return Promise.all([roles, connection.promise().query(managerQuery)]);
    })
    .then(([roles, managers]) => {
      managers = managers[0];
      return inquirer.prompt([
        {
          name: "firstName",
          type: "input",
          message: "What is the employee's first name?",
        },
        {
          name: "lastName",
          type: "input",
          message: "What is the employee's last name?",
        },
        {
          name: "role",
          type: "list",
          choices: roles.map((role) => ({ name: role.title, value: role.id })),
          message: "What is the employee's role?",
        },
        {
          name: "manager",
          type: "list",
          choices: [{ name: "None", value: null }].concat(
            managers.map((manager) => ({
              name: manager.manager,
              value: manager.id,
            }))
          ),
          message: "Who is the employee's manager?",
        },
      ]);
    })
    .then((answers) => {
      const query =
        "INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)";
      return connection
        .promise()
        .query(query, [
          answers.firstName,
          answers.lastName,
          answers.role,
          answers.manager,
        ]);
    })
    .then(() => {
      console.log("Employee added successfully!");
      mainMenu();
    })
    .catch((err) => {
      console.error("Error adding employee:", err);
      mainMenu();
    });
}

function updateEmployeeRole() {
  const employeeQuery =
    'SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employees';
  const roleQuery = "SELECT id, title FROM roles";

  connection
    .promise()
    .query(employeeQuery)
    .then(([employees]) => {
      return Promise.all([employees, connection.promise().query(roleQuery)]);
    })
    .then(([employees, roles]) => {
      roles = roles[0];
      return inquirer.prompt([
        {
          name: "employee",
          type: "list",
          choices: employees.map((emp) => ({ name: emp.name, value: emp.id })),
          message: "Which employee's role do you want to update?",
        },
        {
          name: "role",
          type: "list",
          choices: roles.map((role) => ({ name: role.title, value: role.id })),
          message: "What is the new role?",
        },
      ]);
    })
    .then((answers) => {
      const query = "UPDATE employees SET role_id = ? WHERE id = ?";
      return connection
        .promise()
        .query(query, [answers.role, answers.employee]);
    })
    .then(() => {
      console.log("Employee's role updated successfully!");
      mainMenu();
    })
    .catch((err) => {
      console.error("Error updating employee role:", err);
      mainMenu();
    });
}

function exitApp() {
  connection.end((err) => {
    if (err) {
      console.error("Error closing the database connection:", err);
    } else {
      console.log("Database connection closed.");
    }
    console.log("Goodbye!");
    process.exit();
  });
}

function mainMenu() {
  inquirer
    .prompt({
      name: "action",
      type: "list",
      message: "What would you like to do?",
      choices: [
        "View all departments",
        "View all roles",
        "View all employees",
        "Add a department",
        "Add a role",
        "Add an employee",
        "Update an employee role",
        "Exit",
      ],
    })
    .then((answers) => {
      switch (answers.action) {
        case "View all departments":
          viewDepartments();
          break;
        case "View all roles":
          viewRoles();
          break;
        case "View all employees":
          viewEmployees();
          break;
        case "Add a department":
          addDepartment();
          break;
        case "Add a role":
          addRole();
          break;
        case "Add an employee":
          addEmployee();
          break;
        case "Update an employee role":
          updateEmployeeRole();
          break;
        case "Exit":
          exitApp();
          break;
        default:
          break;
      }
    });
}

// start the application by calling mainMenu()
mainMenu();
