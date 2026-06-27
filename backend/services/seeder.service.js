const {
  Organization,
  Role,
  User,
  Building,
  Floor,
  Space,
  Device,
  Incident,
  ActionLog,
  Notification,
  EventLog
} = require("../models/schemas");

const seedDatabase = async () => {
  try {
    console.log("Forcing database seed. Clearing existing collections...");
    await Organization.deleteMany({});
    await Role.deleteMany({});
    await User.deleteMany({});
    await Building.deleteMany({});
    await Floor.deleteMany({});
    await Space.deleteMany({});
    await Device.deleteMany({});
    await Incident.deleteMany({});
    await ActionLog.deleteMany({});
    await Notification.deleteMany({});
    await EventLog.deleteMany({});

    console.log("Seeding fresh enterprise SaaS configuration...");

    // 1. Create Organization
    const org = await Organization.create({
      name: "Centennial University Campus",
      type: "University"
    });

    // 2. Create Roles
    const rolesList = [
      "SUPER_ADMIN",
      "ORG_ADMIN",
      "FACILITY_MANAGER",
      "SECURITY_OFFICER",
      "LAB_INCHARGE",
      "HOD",
      "EMERGENCY_TEAM",
      "MAINTENANCE_TEAM"
    ];
    for (const rName of rolesList) {
      await Role.create({ name: rName, custom: false, organizationId: org._id });
    }

    // 3. Create Users
    const uSecurity = await User.create({
      name: "Officer Ram",
      email: "security@centennial.edu",
      role: "SECURITY_OFFICER",
      organizationId: org._id
    });

    const uFacility = await User.create({
      name: "Priya Nair",
      email: "facilities@centennial.edu",
      role: "FACILITY_MANAGER",
      organizationId: org._id
    });

    const uHod = await User.create({
      name: "Dr. Kumar",
      email: "hod.robotics@centennial.edu",
      role: "HOD",
      organizationId: org._id
    });

    const uLabIncharge = await User.create({
      name: "Prof. Sinha",
      email: "sinha.lab@centennial.edu",
      role: "LAB_INCHARGE",
      organizationId: org._id
    });

    // 4. Create Buildings
    const bEng = await Building.create({ name: "Engineering Block", organizationId: org._id });
    const bLib = await Building.create({ name: "Library", organizationId: org._id });
    const bAdmin = await Building.create({ name: "Administration Block", organizationId: org._id });
    const bRes = await Building.create({ name: "Research Center", organizationId: org._id });
    const bHostel = await Building.create({ name: "Hostel Block", organizationId: org._id });

    // 5. Create Floors
    const fEngG = await Floor.create({ name: "Ground Floor", buildingId: bEng._id, organizationId: org._id });
    const fLibG = await Floor.create({ name: "Ground Floor", buildingId: bLib._id, organizationId: org._id });
    const fAdmin1 = await Floor.create({ name: "Floor 1", buildingId: bAdmin._id, organizationId: org._id });
    const fRes2 = await Floor.create({ name: "Floor 2", buildingId: bRes._id, organizationId: org._id });
    const fHostel1 = await Floor.create({ name: "Floor 1", buildingId: bHostel._id, organizationId: org._id });

    // 6. Create Spaces & Assign Dynamic Ownership
    // A. Robotics Lab
    const spaceRobotics = await Space.create({
      name: "Robotics Lab",
      spaceType: "Laboratory",
      floorId: fEngG._id,
      buildingId: bEng._id,
      organizationId: org._id,
      owners: {
        primary: uLabIncharge._id,
        secondary: uHod._id,
        escalation: uFacility._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Secure"
    });

    // B. Lecture Hall
    const spaceLecture = await Space.create({
      name: "Main Lecture Hall",
      spaceType: "Classroom",
      floorId: fEngG._id,
      buildingId: bEng._id,
      organizationId: org._id,
      owners: {
        primary: uFacility._id,
        secondary: uHod._id,
        escalation: uLabIncharge._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Nominal"
    });

    // C. Reading Room
    const spaceReading = await Space.create({
      name: "Main Reading Room",
      spaceType: "Library",
      floorId: fLibG._id,
      buildingId: bLib._id,
      organizationId: org._id,
      owners: {
        primary: uFacility._id,
        secondary: uSecurity._id,
        escalation: uHod._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Nominal"
    });

    // D. Registrar Office
    const spaceRegistrar = await Space.create({
      name: "Registrar Office",
      spaceType: "Office",
      floorId: fAdmin1._id,
      buildingId: bAdmin._id,
      organizationId: org._id,
      owners: {
        primary: uFacility._id,
        secondary: uSecurity._id,
        escalation: uHod._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Nominal"
    });

    // E. AI & Robotics Suite
    const spaceAiSuite = await Space.create({
      name: "AI & Robotics Suite",
      spaceType: "Research Lab",
      floorId: fRes2._id,
      buildingId: bRes._id,
      organizationId: org._id,
      owners: {
        primary: uLabIncharge._id,
        secondary: uHod._id,
        escalation: uFacility._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Nominal"
    });

    // F. Mess Hall
    const spaceMess = await Space.create({
      name: "Dining Area Hall",
      spaceType: "Dining Hall",
      floorId: fHostel1._id,
      buildingId: bHostel._id,
      organizationId: org._id,
      owners: {
        primary: uFacility._id,
        secondary: uSecurity._id,
        escalation: uHod._id,
        emergency: uSecurity._id
      },
      peopleCount: 0,
      riskLevel: "LOW",
      statusSummary: "Nominal"
    });

    // 7. Seed Devices
    const allSpaces = [spaceRobotics, spaceLecture, spaceReading, spaceRegistrar, spaceAiSuite, spaceMess];
    
    for (const space of allSpaces) {
      // Light
      await Device.create({
        name: `${space.name} Main Light`,
        type: "Light",
        status: "online",
        health: 100,
        spaceId: space._id,
        floorId: space.floorId,
        buildingId: space.buildingId,
        organizationId: org._id,
        ownerId: space.owners.primary
      });

      // Fan
      await Device.create({
        name: `${space.name} Ventilation Fan`,
        type: "Fan",
        status: "online",
        health: 100,
        spaceId: space._id,
        floorId: space.floorId,
        buildingId: space.buildingId,
        organizationId: org._id,
        ownerId: space.owners.primary
      });

      // Camera
      await Device.create({
        name: `${space.name} Perception Lens`,
        type: "Camera",
        status: "online",
        health: 98,
        spaceId: space._id,
        floorId: space.floorId,
        buildingId: space.buildingId,
        organizationId: org._id,
        ownerId: space.owners.primary
      });

      // Door Lock
      await Device.create({
        name: `${space.name} Actuator Lock`,
        type: "Door Lock",
        status: "online",
        health: 100,
        spaceId: space._id,
        floorId: space.floorId,
        buildingId: space.buildingId,
        organizationId: org._id,
        ownerId: space.owners.primary
      });
    }

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Seeder execution error:", error);
  }
};

module.exports = seedDatabase;
